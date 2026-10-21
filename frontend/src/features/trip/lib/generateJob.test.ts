import { describe, expect, it } from "vitest"

import type { GenerateJob, TripDraft } from "../types"
import {
  formatElapsed,
  ignoreJob,
  isIgnored,
  jobToResponse,
  MAX_POLL_FAILURES,
  shouldKeepPolling,
  loadSnapshot,
  saveSnapshot,
  snapshotFromInput,
} from "./generateJob"

function memoryStorage(): Storage {
  const m = new Map<string, string>()
  return {
    get length() {
      return m.size
    },
    clear: () => m.clear(),
    getItem: (k) => m.get(k) ?? null,
    key: (i) => [...m.keys()][i] ?? null,
    removeItem: (k) => void m.delete(k),
    setItem: (k, v) => void m.set(k, v),
  }
}

const throwingStorage = {
  getItem: () => {
    throw new Error("denied")
  },
  setItem: () => {
    throw new Error("denied")
  },
  removeItem: () => {
    throw new Error("denied")
  },
} as unknown as Storage

describe("formatElapsed", () => {
  it("formats minutes and seconds", () => {
    expect(formatElapsed(0)).toBe("0:00")
    expect(formatElapsed(5_000)).toBe("0:05")
    expect(formatElapsed(84_000)).toBe("1:24")
    expect(formatElapsed(3_723_000)).toBe("1:02:03")
  })

  it("never shows a negative or invalid time", () => {
    expect(formatElapsed(-4000)).toBe("0:00")
    expect(formatElapsed(Number.NaN)).toBe("0:00")
  })
})

describe("jobToResponse", () => {
  const draft = { title: "Bali" } as TripDraft
  const job = (over: Partial<GenerateJob>): GenerateJob => ({
    job_id: "j1",
    status: "done",
    created_at: "2026-11-01T00:00:00Z",
    start_date: "2026-11-01",
    end_date: "2026-11-03",
    draft,
    ...over,
  })

  it("rebuilds the response the review screen expects", () => {
    expect(jobToResponse(job({}))).toEqual({ start_date: "2026-11-01", end_date: "2026-11-03", draft })
  })

  it("is null until the job is done with a draft", () => {
    expect(jobToResponse(job({ status: "running", draft: undefined }))).toBeNull()
    expect(jobToResponse(job({ status: "failed", draft: undefined }))).toBeNull()
    expect(jobToResponse(job({ draft: undefined }))).toBeNull()
    expect(jobToResponse(undefined)).toBeNull()
  })
})

describe("ignored jobs", () => {
  it("remembers a used job and drops its snapshot", () => {
    const s = memoryStorage()
    saveSnapshot("a", { destination: "Bali", venue: null }, s)
    expect(loadSnapshot("a", s)).toEqual({ destination: "Bali", venue: null })

    ignoreJob("a", s)
    expect(isIgnored("a", s)).toBe(true)
    expect(isIgnored("b", s)).toBe(false)
    expect(loadSnapshot("a", s)).toBeNull()
  })

  it("keeps only the 10 most recent ids", () => {
    const s = memoryStorage()
    for (let i = 0; i < 12; i++) ignoreJob(`j${i}`, s)
    expect(isIgnored("j0", s)).toBe(false)
    expect(isIgnored("j1", s)).toBe(false)
    expect(isIgnored("j2", s)).toBe(true)
    expect(isIgnored("j11", s)).toBe(true)
  })

  it("survives missing or throwing storage", () => {
    for (const s of [null, throwingStorage]) {
      expect(() => ignoreJob("a", s)).not.toThrow()
      expect(() => saveSnapshot("a", { destination: "x", venue: null }, s)).not.toThrow()
      expect(isIgnored("a", s)).toBe(false)
      expect(loadSnapshot("a", s)).toBeNull()
    }
  })

  it("ignores corrupted stored data", () => {
    const s = memoryStorage()
    s.setItem("navisha:autogen:ignored-jobs", "{not json")
    expect(isIgnored("a", s)).toBe(false)
    ignoreJob("a", s)
    expect(isIgnored("a", s)).toBe(true)
  })
})

describe("snapshotFromInput", () => {
  const base = { destination: "Bali", start_date: "2026-11-01", end_date: "2026-11-03", base_currency: "IDR" }

  it("keeps the venue only when it has coordinates", () => {
    expect(snapshotFromInput(base)).toEqual({ destination: "Bali", venue: null })
    const withVenue = snapshotFromInput({
      ...base,
      event: { name: "x", venue: { label: "Arena", lat: -6.1, lng: 106.8 }, date: "2026-11-02", start_time: "10:00", end_time: "12:00" },
    })
    expect(withVenue.venue).toEqual({ lat: -6.1, lng: 106.8, date: "2026-11-02" })
    const noCoords = snapshotFromInput({
      ...base,
      event: { name: "x", venue: { label: "Arena" }, date: "2026-11-02", start_time: "10:00", end_time: "12:00" },
    })
    expect(noCoords.venue).toBeNull()
  })
})

describe("shouldKeepPolling", () => {
  it("polls while the job runs or has not answered yet", () => {
    expect(shouldKeepPolling(undefined, 0)).toBe(true)
    expect(shouldKeepPolling("running", 0)).toBe(true)
    expect(shouldKeepPolling("running", MAX_POLL_FAILURES - 1)).toBe(true)
  })

  it("stops once the job finished", () => {
    expect(shouldKeepPolling("done", 0)).toBe(false)
    expect(shouldKeepPolling("failed", 0)).toBe(false)
  })

  it("gives up after too many failed polls in a row", () => {
    expect(shouldKeepPolling("running", MAX_POLL_FAILURES)).toBe(false)
    expect(shouldKeepPolling(undefined, MAX_POLL_FAILURES)).toBe(false)
  })
})
