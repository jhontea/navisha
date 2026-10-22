import { describe, expect, it } from "vitest"

import { framePoints } from "./mapViewport"

const kyoto = { lat: 35.01, lng: 135.77 }
const osaka = { lat: 34.69, lng: 135.5 }
const nara = { lat: 34.68, lng: 135.8 }
const tokyo = { lat: 35.68, lng: 139.69 }
const tokyo2 = { lat: 35.66, lng: 139.7 }
const majalengka = { lat: -6.84, lng: 108.23 }
const jakarta = { lat: -6.2, lng: 106.85 }
const london = { lat: 51.5, lng: -0.12 }
const bandung = { lat: -6.9, lng: 107.6 }

describe("framePoints", () => {
  it("leaves out a single far-away point", () => {
    const r = framePoints([kyoto, osaka, nara, tokyo, tokyo2, majalengka])
    expect(r.outside).toBe(1)
    expect(r.framed).not.toContain(majalengka)
    expect(r.framed).toHaveLength(5)
  })

  it("leaves out a small far-away group, not just single points", () => {
    const r = framePoints([kyoto, osaka, nara, tokyo, tokyo2, kyoto, osaka, tokyo, nara, tokyo2, majalengka, jakarta])
    expect(r.outside).toBe(2)
    expect(r.framed).toHaveLength(10)
  })

  it("keeps cities 400 km apart", () => {
    const r = framePoints([kyoto, osaka, tokyo, tokyo2])
    expect(r).toEqual({ framed: [kyoto, osaka, tokyo, tokyo2], outside: 0 })
  })

  it("frames everything when over 20% are isolated", () => {
    const pts = [kyoto, osaka, tokyo, tokyo2, majalengka, london]  // two lone points out of six
    expect(framePoints(pts)).toEqual({ framed: pts, outside: 0 })
  })

  it("frames everything when fewer than 2 points would remain", () => {
    const pts = [kyoto, majalengka, london]
    expect(framePoints(pts)).toEqual({ framed: pts, outside: 0 })
  })

  it("does not drop nearby points in a far-from-home trip", () => {
    const pts = [majalengka, jakarta, bandung]
    expect(framePoints(pts).outside).toBe(0)
  })

  it("handles 1 and 0 points", () => {
    expect(framePoints([kyoto])).toEqual({ framed: [kyoto], outside: 0 })
    expect(framePoints([])).toEqual({ framed: [], outside: 0 })
  })
})
