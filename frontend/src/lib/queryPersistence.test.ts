import { describe, expect, it } from "vitest"
import { QueryClient } from "@tanstack/react-query"

import { createBoundedState } from "./queryPersistence"

const MINUTE = 60 * 1000
const DAY = 24 * 60 * MINUTE

describe("createBoundedState", () => {
  it("keeps trip data for a week, drops older data and converter results", () => {
    const now = Date.now()
    const client = new QueryClient()
    client.setQueryData(["trips", "detail", "fresh"], { id: "fresh" }, { updatedAt: now - 31 * MINUTE })
    client.setQueryData(["trips", "detail", "week"], { id: "week" }, { updatedAt: now - 6 * DAY })
    client.setQueryData(["trips", "detail", "old"], { id: "old" }, { updatedAt: now - 8 * DAY })
    client.setQueryData(["auth", "me"], { id: "user" }, { updatedAt: now })
    client.setQueryData(["currency", "convert", "IDR", "JPY", 100], { result: 1 }, { updatedAt: now })

    const keys = createBoundedState(client, now).queries.map((q) => q.queryKey[2] ?? q.queryKey[0])
    expect(keys).toEqual(["fresh", "week"])
  })
})
