import { describe, expect, it } from "vitest"
import type { Active, Over } from "@dnd-kit/core"

import { insertAtOrderIndex, isSortedByStartTime, reorderAnnouncements, sortByStartTime } from "./order"

const act = (id: string, start_time?: string, order_index?: number) => ({ id, start_time, order_index })

describe("sortByStartTime", () => {
  it("moves an 11:00 lunch added last before a 14:00 meeting", () => {
    const day = [act("breakfast", "08:00"), act("meeting", "14:00"), act("lunch", "11:00")]
    expect(sortByStartTime(day).map((a) => a.id)).toEqual(["breakfast", "lunch", "meeting"])
  })

  it("keeps untimed activities in their slots and ties in their order", () => {
    const day = [act("dinner", "19:00"), act("note"), act("a", "09:00:00"), act("b", "09:00")]
    expect(sortByStartTime(day).map((a) => a.id)).toEqual(["a", "note", "b", "dinner"])
  })

  it("reports whether a day is already sorted", () => {
    expect(isSortedByStartTime([act("a", "08:00"), act("n"), act("b", "09:00")])).toBe(true)
    expect(isSortedByStartTime([act("b", "09:00"), act("a", "08:00")])).toBe(false)
  })
})

describe("insertAtOrderIndex", () => {
  it("places a created activity at its server position", () => {
    const day = [act("a"), act("b")]
    expect(insertAtOrderIndex(day, act("new", "10:00", 1)).map((a) => a.id)).toEqual(["a", "new", "b"])
    expect(insertAtOrderIndex(day, act("new", undefined, 9)).map((a) => a.id)).toEqual(["a", "b", "new"])
  })
})

describe("reorderAnnouncements", () => {
  const announcements = reorderAnnouncements([
    { id: "049b-uuid", title: "Lunch" },
    { id: "2abe-uuid", title: "Fan meeting" },
  ])
  const active = { id: "2abe-uuid" } as Active
  const over = { id: "049b-uuid" } as Over

  it("names activities by title, never by id", () => {
    const messages = [
      announcements.onDragStart({ active }),
      announcements.onDragOver({ active, over }),
      announcements.onDragEnd({ active, over }),
      announcements.onDragCancel({ active, over: null }),
    ]
    expect(messages[0]).toBe("Picked up Fan meeting, position 2 of 2.")
    expect(messages[2]).toBe("Fan meeting dropped at position 1 of 2.")
    for (const message of messages) expect(message).not.toMatch(/uuid/)
  })
})
