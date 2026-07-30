import {
  dehydrate,
  hydrate,
  type DehydratedState,
  type Query,
  type QueryClient,
} from "@tanstack/react-query"

const DB_NAME = "navisha-query-cache"
const STORE_NAME = "snapshots"
const CACHE_KEY = "dashboard-v1"
const MAX_AGE_MS = 30 * 60 * 1000
const WRITE_DEBOUNCE_MS = 750

interface PersistedSnapshot {
  savedAt: number
  state: DehydratedState
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
    try {
      const request = indexedDB.open(DB_NAME, 1)
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE_NAME)) {
          request.result.createObjectStore(STORE_NAME)
        }
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => resolve(null)
      request.onblocked = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
}

async function readSnapshot(): Promise<PersistedSnapshot | null> {
  const db = await openDatabase()
  if (!db) return null

  return new Promise((resolve) => {
    const transaction = db.transaction(STORE_NAME, "readonly")
    const request = transaction.objectStore(STORE_NAME).get(CACHE_KEY)
    request.onsuccess = () => resolve((request.result as PersistedSnapshot | undefined) ?? null)
    request.onerror = () => resolve(null)
    transaction.oncomplete = () => db.close()
    transaction.onerror = () => {
      db.close()
      resolve(null)
    }
  })
}

async function writeSnapshot(snapshot: PersistedSnapshot): Promise<void> {
  const db = await openDatabase()
  if (!db) return

  await new Promise<void>((resolve) => {
    const transaction = db.transaction(STORE_NAME, "readwrite")
    transaction.objectStore(STORE_NAME).put(snapshot, CACHE_KEY)
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

export async function restorePersistedQueries(queryClient: QueryClient): Promise<void> {
  const snapshot = await readSnapshot()
  if (!snapshot) return
  if (Date.now() - snapshot.savedAt > MAX_AGE_MS) {
    await clearPersistedQueries()
    return
  }
  hydrate(queryClient, snapshot.state)
}

export function subscribeToQueryPersistence(queryClient: QueryClient): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined

  const unsubscribe = queryClient.getQueryCache().subscribe(() => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      const state = dehydrate(queryClient, { shouldDehydrateQuery: shouldPersistQuery })
      void writeSnapshot({ savedAt: Date.now(), state })
    }, WRITE_DEBOUNCE_MS)
  })

  return () => {
    unsubscribe()
    if (timer) clearTimeout(timer)
  }
}

export async function clearPersistedQueries(): Promise<void> {
  const db = await openDatabase()
  if (!db) return

  await new Promise<void>((resolve) => {
    const transaction = db.transaction(STORE_NAME, "readwrite")
    transaction.objectStore(STORE_NAME).delete(CACHE_KEY)
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
