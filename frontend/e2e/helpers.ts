import { expect, type Page, type TestInfo } from "@playwright/test"

export const API = process.env.E2E_API_URL ?? "http://localhost:8090/api/v1"

/**
 * Sign in a fresh test user through the test-only endpoint
 * (POST /auth/test-login, APP_ENV=test + E2E_AUTH=true). Each test gets its
 * own user so tests never see each other's trips.
 */
export async function signIn(page: Page, testInfo: TestInfo) {
  const email = `e2e-${testInfo.project.name}-${testInfo.workerIndex}-${Date.now()}@e2e.test`
  const res = await page.request.post(`${API}/auth/test-login`, { data: { email, name: "E2E Tester" } })
  expect(res.ok(), `test-login failed: ${res.status()} ${await res.text()}`).toBeTruthy()
}

/** Create a trip through the API for flows that start from an existing trip. */
export async function createTrip(
  page: Page,
  trip: { title: string; start_date: string; end_date: string; base_currency?: string; budget?: number },
): Promise<string> {
  const res = await page.request.post(`${API}/trips`, {
    data: { base_currency: "IDR", ...trip },
  })
  expect(res.ok(), `create trip failed: ${res.status()} ${await res.text()}`).toBeTruthy()
  const body = (await res.json()) as { id: string }
  return body.id
}

/** YYYY-MM-DD for a day offset from today (local time). */
export function isoDate(offsetDays: number): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
