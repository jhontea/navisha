import { describe, expect, it } from "vitest"

import { sheetCloseAction } from "./discardGuard"

describe("sheetCloseAction", () => {
  it("closes an untouched form and asks before discarding typed input", () => {
    expect(sheetCloseAction(false)).toBe("close")
    expect(sheetCloseAction(true)).toBe("confirm")
  })
})
