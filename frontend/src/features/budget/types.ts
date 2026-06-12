export interface Expense {
  id: string
  trip_id: string
  activity_id: string | null
  title: string
  amount: number
  currency: string
  converted_amount: number
  base_currency: string
  category: string
  created_at: string
}

export interface ExpenseSummary {
  total_base: number
  base_currency: string
  by_category: { category: string; total: number }[]
}

export interface CurrencyRate {
  currency: string
  rate: number
  symbol: string
}
