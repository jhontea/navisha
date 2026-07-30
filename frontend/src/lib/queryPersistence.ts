import {
  dehydrate,
  hydrate,
  type DehydratedState,
  type Query,
  type QueryClient,
} from "@tanstack/react-query"

const DB_NAME = "navisha-query-cache"
const STORE_NAME = "snapshots"
const LEGACY_CACHE_KEY = "dashboard-v1"
const CACHE_KEY_PREFIX = "dashboard-v2:"
const MAX_AGE_MS = 30 * 60 * 1000
const WRITE_DEBOUNCE_MS = 750
const DB_OPEN_TIMEOUT_MS = 150
const DB_READ_TIMEOUT_MS = 150
const MAX_PERSISTED_QUERIES = 40
const MAX_SNAPSHOT_BYTES = 1_500_000

interface PersistedSnapshot {
  userID: string
  savedAt: number
  state: DehydratedState
}

function cacheKey(userID: string): string {
  return `${CACHE_KEY_PREFIX}${userID}`
}

const PERSISTED_PREFIXES = new Set([
  "trips",
  "activities",
  "accommodations",
  "transportations",
  "expenses",
  "currency",
])

function shouldPersistQuery(query: Query) {
  const prefix = String(query.queryKey[0] ?? "")
  return query.state.status === "success" && PERSISTED_PREFIXES.has(prefix)
}

function openDatabase(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null)

  return new Promise((resolve) => {
    let settled = false
    const finish = (database: IDBDatabase | null) => {
      if (settled) {
        database?.close()
        return
      }
      settled = true
      clearTimeout(timeout)
      resolve(database)
    }
    const timeout = setTimeout(() => finish(null), DB_OPEN_TIMEOUT_MS)

    try {
      const request = indexedDB.open(DB_NAME, 1)
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE_NAME)) {
          request.result.createObjectStore(STORE_NAME)
        }
      }
      request.onsuccess = () => finish(request.result)
      request.onerror = () => finish(null)
      request.onblocked = () => finish(null)
    } catch {
      finish(null)
    }
  })
}

function createBoundedState(queryClient: QueryClient): DehydratedState {
  const now = Date.now()
  const state = dehydrate(queryClient, { shouldDehydrateQuery: shouldPersistQuery })
  const candidates = state.queries
    .filter((query) => now - query.state.dataUpdatedAt <= MAX_AGE_MS)
    .sort((a, b) => b.state.dataUpdatedAt - a.state.dataUpdatedAt)
    .slice(0, MAX_PERSISTED_QUERIES)

  const encoder = new TextEncoder()
  const queries: DehydratedState["queries"] = []
  let byteLength = encoder.encode(JSON.stringify({ ...state, queries })).byteLength
  for (const query of candidates) {
    const queryBytes = encoder.encode(JSON.stringify(query)).byteLength
    if (byteLength + queryBytes > MAX_SNAPSHOT_BYTES) break
    queries.push(query)
    byteLength += queryBytes
  }
  return { ...state, queries }
}

async function readSnapshot(userID: string): Promise<PersistedSnapshot | null> {
  const db = await openDatabase()
  if (!db) return null

  return new Promise((resolve) => {
    let settled = false
    const finish = (snapshot: PersistedSnapshot | null) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      db.close()
      resolve(snapshot)
    }
    const timeout = setTimeout(() => finish(null), DB_READ_TIMEOUT_MS)
    const transaction = db.transaction(STORE_NAME, "readwrite")
    const store = transaction.objectStore(STORE_NAME)
    // Older builds used one cache key for every account. It is never hydrated
    // again and is removed as soon as an authenticated user initializes cache.
    store.delete(LEGACY_CACHE_KEY)
    const request = store.get(cacheKey(userID))
    request.onsuccess = () => finish((request.result as PersistedSnapshot | undefined) ?? null)
    request.onerror = () => finish(null)
    transaction.onerror = () => finish(null)
  })
}

async function writeSnapshot(userID: string, snapshot: PersistedSnapshot): Promise<void> {
  const db = await openDatabase()
  if (!db) return

  await new Promise<void>((resolve) => {
    const transaction = db.transaction(STORE_NAME, "readwrite")
    transaction.objectStore(STORE_NAME).put(snapshot, cacheKey(userID))
    transaction.oncomplete = () => {
      db.close()
      resolve()
    }
    transaction.onerror = () => {
      db.close()
      resolve()
    }
  })
}

export async function restorePersistedQueries(queryClient: QueryClient, userID: string): Promise<void> {
  const snapshot = await readSnapshot(userID)
  if (!snapshot) return
  if (snapshot.userID !== userID || Date.now() - snapshot.savedAt > MAX_AGE_MS) {
    void clearPersistedQueries(userID)
    return
  }
  hydrate(queryClient, snapshot.state)
}

export function subscribeToQueryPersistence(queryClient: QueryClient, userID: string): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined

  const unsubscribe = queryClient.getQueryCache().subscribe(() => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      const state = createBoundedState(queryClient)
      void writeSnapshot(userID, { userID, savedAt: Date.now(), state })
    }, WRITE_DEBOUNCE_MS)
  })

  return () => {
    unsubscribe()
    if (timer) clearTimeout(timer)
  }
}

export async function clearPersistedQueries(userID?: string): Promise<void> {
  const db = await openDatabase()
  if (!db) return

  await new Promise<void>((resolve) => {
    const transaction = db.transaction(STORE_NAME, "readwrite")
    const store = transaction.objectStore(STORE_NAME)
    if (userID) {
      store.delete(cacheKey(userID))
    } else {
      // Also removes the legacy unscoped dashboard-v1 snapshot.
      store.clear()
    }
    transaction.oncomplete = () => {
      db.close()
      resolve()
    }
    transaction.onerror = () => {
      db.close()
      resolve()
    }
  })
}
