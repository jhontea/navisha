interface TripDetailsActionability {
  title: string
  startDate: string
  endDate: string
}

export function getTripSaveDisabledReason({
  title,
  startDate,
  endDate,
}: TripDetailsActionability): string | null {
  if (!title.trim()) return "Enter a trip title to continue."
  if (!startDate || !endDate) return "Select your travel dates to continue."
  return null
}

export function getBudgetSaveDisabledReason(rawBudget: string): string | null {
  if (!rawBudget.trim()) return "Enter a budget amount to continue."

  const budget = Number(rawBudget)
  if (!Number.isFinite(budget) || budget <= 0) {
    return "Budget must be greater than zero."
  }

  return null
}
