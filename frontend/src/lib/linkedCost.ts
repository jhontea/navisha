/**
 * A booking's Cost field is backed by one expense linked to it
 * (expenses.transportation_id / accommodation_id).
 */
export interface LinkedCost {
  amount: number
  currency: string
}

type LinkedExpense = {
  amount: number
  currency: string
  transportation_id?: string | null
  accommodation_id?: string | null
}

/** The cost of a transport or stay, from the trip's expenses; null when it has none. */
export function linkedCost(
  expenses: LinkedExpense[] | undefined,
  kind: "transportation" | "accommodation",
  bookingId: string,
): LinkedCost | null {
  const key = kind === "transportation" ? "transportation_id" : "accommodation_id"
  const expense = expenses?.find((e) => e[key] === bookingId)
  return expense ? { amount: expense.amount, currency: expense.currency } : null
}

/**
 * The `cost` sent with a booking.
 * - "add": only an amount creates an expense;
 * - "edit": always sent, so clearing the amount (0) removes the expense;
 * - "off": the form has no cost field, the expense is left alone.
 */
export function costPayload(
  amountText: string | undefined,
  currency: string | undefined,
  mode: "add" | "edit" | "off",
): LinkedCost | null {
  if (mode === "off" || !currency) return null
  const amount = amountText ? Number(amountText) : 0
  if (Number.isFinite(amount) && amount > 0) return { amount, currency }
  return mode === "edit" ? { amount: 0, currency } : null
}
