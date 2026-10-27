import { describe, expect, it } from "vitest"
import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSnow, CloudSun, Sun } from "lucide-react"

import { inForecastRange, weatherInfo } from "./weather"

describe("weatherInfo", () => {
  it.each([
    [0, Sun, "Clear"],
    [1, CloudSun, "Mainly clear"],
    [2, CloudSun, "Partly cloudy"],
    [3, Cloud, "Overcast"],
    [45, CloudFog, "Fog"],
    [48, CloudFog, "Fog"],
    [51, CloudDrizzle, "Drizzle"],
    [55, CloudDrizzle, "Drizzle"],
    [57, CloudDrizzle, "Freezing drizzle"],
    [61, CloudRain, "Rain"],
    [65, CloudRain, "Rain"],
    [67, CloudRain, "Freezing rain"],
    [80, CloudRain, "Rain"],
    [82, CloudRain, "Rain"],
    [71, CloudSnow, "Snow"],
    [77, CloudSnow, "Snow"],
    [85, CloudSnow, "Snow"],
    [86, CloudSnow, "Snow"],
    [95, CloudLightning, "Thunderstorm"],
    [99, CloudLightning, "Thunderstorm"],
    [42, Cloud, "Cloudy"],
  ])("maps WMO %i", (code, Icon, label) => {
    expect(weatherInfo(code)).toEqual({ Icon, label })
  })
})

describe("inForecastRange", () => {
  const today = "2026-10-27"

  it("accepts trips overlapping today..+15", () => {
    expect(inForecastRange("2026-10-28", "2026-10-30", today)).toBe(true)
    expect(inForecastRange("2026-10-20", "2026-10-27", today)).toBe(true)
    expect(inForecastRange("2026-11-12", "2026-11-20", today)).toBe(true)
  })

  it("rejects trips well past or well ahead", () => {
    expect(inForecastRange("2026-10-01", "2026-10-25", today)).toBe(false)
    expect(inForecastRange("2026-11-14", "2026-11-20", today)).toBe(false)
  })
})
