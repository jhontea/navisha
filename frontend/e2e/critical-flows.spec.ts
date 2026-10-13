import { expect, test } from "@playwright/test"

import { createTrip, isoDate, signIn } from "./helpers"

test.describe("critical flows", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await signIn(page, testInfo)
  })

  test("create a trip from scratch", async ({ page }) => {
    await page.goto("/trips")
    await page.getByRole("link", { name: "Start from scratch" }).click()
    await expect(page).toHaveURL(/\/trips\/new$/)

    await page.locator("#trip-title").fill("E2E weekend in Kyoto")

    // Pick the 10th to the 12th of next month in the travel date picker.
    const next = new Date()
    next.setMonth(next.getMonth() + 1, 10)
    const label = (day: number) =>
      new Date(next.getFullYear(), next.getMonth(), day).toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    await page.getByRole("button", { name: /Travel dates/ }).click()
    const picker = page.getByRole("dialog")
    await picker.getByRole("button", { name: "Next month" }).click()
    await picker.getByRole("button", { name: label(10), exact: true }).click()
    // The end date may open a second picker step; pick it in whichever dialog is shown.
    await page.getByRole("dialog").getByRole("button", { name: label(12), exact: true }).click()

    await page.getByRole("button", { name: "Create trip" }).click()

    await expect(page).toHaveURL(/\/trips\/[0-9a-f-]{36}$/)
    await expect(page.getByText("E2E weekend in Kyoto").first()).toBeVisible()
    await expect(page.getByRole("button", { name: /Day 1/ }).first()).toBeVisible()
  })

  test("add an activity to a day", async ({ page }) => {
    const tripId = await createTrip(page, {
      title: "E2E activity trip",
      start_date: isoDate(20),
      end_date: isoDate(21),
    })
    await page.goto(`/trips/${tripId}`)

    await page.getByRole("button", { name: /Add to Day 1/ }).click()
    await page.getByRole("menuitem", { name: /Add activity/ }).click()

    const sheet = page.getByRole("dialog")
    await sheet.getByRole("group", { name: "Activity type" }).getByRole("button", { name: "Note" }).click()
    await sheet.locator("#activity-title").fill("Pack the rail pass")
    await sheet.getByPlaceholder("Write your notes here…").fill("Passport and charger too.")
    await sheet.getByRole("button", { name: "Add activity" }).click()

    await expect(sheet).toBeHidden()
    await expect(page.getByText("Pack the rail pass")).toBeVisible()

    // Saved on the server, not only in the cache.
    await page.reload()
    await expect(page.getByText("Pack the rail pass")).toBeVisible()
  })

  test("add an expense and see the budget total", async ({ page }) => {
    const tripId = await createTrip(page, {
      title: "E2E budget trip",
      start_date: isoDate(30),
      end_date: isoDate(32),
      budget: 1_000_000,
    })
    await page.goto(`/trips/${tripId}/budget`)
    await expect(page.getByText("No expenses yet")).toBeVisible()

    await page.getByRole("button", { name: "Add expense" }).click()
    const sheet = page.getByRole("dialog")
    await sheet.getByRole("button", { name: /^Food/ }).click()
    await sheet.locator("#expense-title").fill("Ramen dinner")
    await sheet.locator("#expense-amount").fill("150000")
    await sheet.getByRole("button", { name: "Add expense" }).click()
    await expect(sheet).toBeHidden()

    await expect(page.getByText("Ramen dinner")).toBeVisible()
    const spent = page.locator("section", { has: page.getByRole("heading", { name: "Spent" }) })
    await expect(spent).toContainText("Rp 150,000")
    await expect(spent).toContainText("of Rp 1,000,000 budget")
    await expect(spent).toContainText("15% used")
    await expect(spent).toContainText("Rp 850,000 left")
  })
})
