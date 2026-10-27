import { describe, expect, it } from "vitest"

import type { StayDraft } from "@/features/accommodation/types"
import type { TransportDraft } from "@/features/transportation/types"
import { transportFormDefaults, transportFormSchema } from "@/features/transportation/lib/transportFormValues"
import { stayDraft, transportDraft } from "./drafts"

const transport: TransportDraft = {
  type: "",
  label: "GA 404",
  operator: "Garuda Fiktif",
  reference_number: "ABC123",
  from_location: "Jakarta (CGK)",
  to_location: "Denpasar (DPS)",
  departure_datetime: "2026-11-02T06:30:00Z",
  arrival_datetime: null,
  notes: "",
}

describe("transportDraft", () => {
  it("clips text to the form limits so a save is never blocked", () => {
    const d = transportDraft({ ...transport, notes: "x".repeat(5000), from_location: "y".repeat(300) })
    expect(d.notes).toHaveLength(2000)
    expect(d.from_location).toHaveLength(200)
    expect(d.label).toBe("GA 404")
  })

  it("never leaves half of a surrogate pair", () => {
    const d = transportDraft({ ...transport, label: "a".repeat(119) + "😀" })
    expect(d.label).toBe("a".repeat(119))
  })

  it("prefills the form with wall-clock times, an empty arrival, the default type and the cost as given", () => {
    const values = transportFormDefaults(transportDraft(transport), "IDR", { amount: 120.5, currency: "USD" })
    expect(values).toMatchObject({
      type: "flight",
      label: "GA 404",
      departure_datetime: "2026-11-02T06:30",
      arrival_datetime: "",
      amount: "120.5",
      currency: "USD",
    })
    expect(transportFormSchema.safeParse(values).success).toBe(true)
  })

  it("leaves a missing departure empty for the user to fill", () => {
    expect(transportFormDefaults({ ...transport, departure_datetime: null }, "IDR").departure_datetime).toBe("")
  })
})

describe("stayDraft", () => {
  const stay: StayDraft = {
    accommodation_type: "hotel",
    name: "Hotel Fiktif",
    location_name: "z".repeat(300),
    check_in: "2026-11-02",
    check_out: "2026-11-05",
    check_in_time: "14:00",
    check_out_time: null,
    confirmation_number: "H".repeat(150),
    notes: "n".repeat(2500),
  }

  it("clips text to the form limits and keeps the rest", () => {
    const d = stayDraft(stay)
    expect(d.location_name).toHaveLength(200)
    expect(d.notes).toHaveLength(2000)
    expect(d.confirmation_number).toHaveLength(120)
    expect(d).toMatchObject({ name: "Hotel Fiktif", check_in: "2026-11-02", check_out_time: null })
  })
})
