export type ExpenseCategory =
  | "accommodation"
  | "transport"
  | "food"
  | "activity"
  | "other"

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "accommodation",
  "transport",
  "food",
  "activity",
  "other",
]

export interface Expense {
  id: string
  trip_id: string
  activity_id: string | null
  title: string
  amount: number
  currency: string
  converted_amount: number
  base_currency: string
  category: ExpenseCategory
  created_at: string
  updated_at: string
}

export interface ExpenseListResponse {
  items: Expense[]
}

export interface CategoryTotal {
  category: ExpenseCategory
  total: number
}

export interface ExpenseSummary {
  total_base: number
  base_currency: string
  by_category: CategoryTotal[]
}

export interface CreateExpenseInput {
  title: string
  amount: number
  currency: string
  category: ExpenseCategory
  activity_id?: string | null
}

export type UpdateExpenseInput = CreateExpenseInput
