import type { GenerateJob, GenerateTripInput, GenerateTripResponse } from "../types"
import type { VenueAnchor } from "./venueRadius"

const IGNORED_KEY = "navisha:autogen:ignored-jobs"
const SNAPSHOT_PREFIX = "navisha:autogen:job:"
const MAX_IGNORED = 10

/** What the screen needs again after the user comes back to a running job. */
export interface JobSnapshot {
  destination: string
  venue: VenueAnchor | null
}

function browserStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage
  } catch {
    return null
  }
}

/** "1:24", "0:05", "1:02:03". Negative or invalid becomes 0:00. */
export function formatElapsed(ms: number): string {
  const total = Number.isFinite(ms) && ms > 0 ? Math.floor(ms / 1000) : 0
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = String(total % 60).padStart(2, "0")
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`
}

/** Same shape the screen used to get from the synchronous generate call. */
export function jobToResponse(job: GenerateJob | null | undefined): GenerateTripResponse | null {
  if (!job || job.status !== "done" || !job.draft) return null
  return { start_date: job.start_date, end_date: job.end_date, draft: job.draft }
}

export function snapshotFromInput(input: GenerateTripInput): JobSnapshot {
  const ev = input.event
  return {
    destination: input.destination,
    venue: ev?.venue.lat != null && ev.venue.lng != null ? { lat: ev.venue.lat, lng: ev.venue.lng, date: ev.date } : null,
  }
}

export function saveSnapshot(jobId: string, snap: JobSnapshot, storage: Storage | null = browserStorage()): void {
  try {
    storage?.setItem(SNAPSHOT_PREFIX + jobId, JSON.stringify(snap))
  } catch {
    // Private mode or full storage: coming back just loses the venue hint.
  }
}

export function loadSnapshot(jobId: string, storage: Storage | null = browserStorage()): JobSnapshot | null {
  try {
    const raw = storage?.getItem(SNAPSHOT_PREFIX + jobId)
    return raw ? (JSON.parse(raw) as JobSnapshot) : null
  } catch {
    return null
  }
}

function readIgnored(storage: Storage | null): string[] {
  try {
    const parsed: unknown = JSON.parse(storage?.getItem(IGNORED_KEY) ?? "[]")
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : []
  } catch {
    return []
  }
}

/** True for a job the user already used (Create trip) or dismissed. */
export function isIgnored(jobId: string, storage: Storage | null = browserStorage()): boolean {
  return readIgnored(storage).includes(jobId)
}

/** Stops the job coming back from "active" and drops its snapshot. */
export function ignoreJob(jobId: string, storage: Storage | null = browserStorage()): void {
  try {
    storage?.removeItem(SNAPSHOT_PREFIX + jobId)
    const ids = [...readIgnored(storage).filter((id) => id !== jobId), jobId].slice(-MAX_IGNORED)
    storage?.setItem(IGNORED_KEY, JSON.stringify(ids))
  } catch {
    // Without storage the finished job may show again once; harmless.
  }
}
