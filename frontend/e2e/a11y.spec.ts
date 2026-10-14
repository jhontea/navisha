import AxeBuilder from "@axe-core/playwright"
import { expect, test, type Page } from "@playwright/test"

import { API, createTrip, isoDate, signIn } from "./helpers"

/**
 * Accessibility scan (plan D6) of every main page with real content.
 * Fails on serious / critical WCAG 2.1 A/AA violations; minor and moderate
 * ones are attached to the report for follow-up.
 */

async function scan(page: Page, label: string) {
  // Let client data load before scanning.
  await page.waitForLoadState("networkidle")
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze()
  const blocking = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical")
  const summary = results.violations.map(
    (v) => `${v.impact} ${v.id}: ${v.help} (${v.nodes.length}) → ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`,
  )
  await test.info().attach(`axe ${label}`, { body: summary.join("\n") || "no violations", contentType: "text/plain" })
  expect.soft(blocking.map((v) => `${v.id}: ${v.help} → ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`), label).toEqual([])
}

test.describe("accessibility", () => {
  test("public pages", async ({ page }) => {
    await page.goto("/")
    await scan(page, "landing")
    await page.goto("/login")
    await scan(page, "login")
  })

  test("signed-in pages with content", async ({ page }, testInfo) => {
    await signIn(page, testInfo)

    await page.goto("/trips")
    await scan(page, "trips (empty)")

    const tripId = await createTrip(page, {
      title: "A11y check trip",
      start_date: isoDate(10),
      end_date: isoDate(12),
      budget: 2_000_000,
    })
    const trip = await (await page.request.get(`${API}/trips/${tripId}`)).json()
    const dayId: string = trip.days[0].id
    const post = async (path: string, data: unknown) => {
      const res = await page.request.post(`${API}${path}`, { data })
      expect(res.ok(), `${path}: ${res.status()} ${await res.text()}`).toBeTruthy()
      return res.json()
    }
    await post(`/days/${dayId}/activities`, {
      type: "location",
      title: "Fushimi Inari",
      start_time: "08:00",
      end_time: "10:00",
      payload: { location_name: "Fushimi Inari Taisha", address: "Kyoto", lat: 34.9671, lng: 135.7727 },
    })
    await post(`/days/${dayId}/activities`, { type: "note", title: "Buy a bus pass", payload: { content: "At the station." } })
    await post(`/trips/${tripId}/expenses`, { title: "Ramen", amount: 120000, currency: "IDR", category: "food" })
    await post(`/trips/${tripId}/transportations`, {
      type: "train",
      label: "Shinkansen",
      from_location: "Tokyo",
      to_location: "Kyoto",
      departure_datetime: `${isoDate(10)}T07:00:00Z`,
    })
    await post(`/trips/${tripId}/accommodations`, {
      name: "Kyoto Inn",
      accommodation_type: "hotel",
      check_in: isoDate(10),
      check_out: isoDate(12),
    })
    const share = await post(`/trips/${tripId}/share-links`, { duration_days: 1 })

    for (const [path, label] of [
      ["/trips", "trips"],
      [`/trips/${tripId}`, "itinerary"],
      [`/trips/${tripId}/map`, "map"],
      [`/trips/${tripId}/bookings`, "bookings"],
      [`/trips/${tripId}/budget`, "budget"],
      [`/trips/${tripId}/summary`, "summary (empty)"],
      ["/trips/new", "new trip"],
      ["/trips/generate", "generate"],
      ["/profile", "profile"],
      [`/share/${share.token}`, "share"],
    ] as const) {
      await page.goto(path)
      await scan(page, label)
    }
  })
})
