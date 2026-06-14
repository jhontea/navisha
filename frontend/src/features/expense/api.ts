import { api } from "@/lib/api"
import type {
  CreateExpenseInput,
  Expense,
  ExpenseListResponse,
  ExpenseSummary,
  UpdateExpenseInput,
} from "./types"

export const expenseApi = {
  list: (tripId: string) =>
    api.get<ExpenseListResponse>(`/trips/${tripId}/expenses`),

  summary: (tripId: string) =>
    api.get<ExpenseSummary>(`/trips/${tripId}/expenses/summary`),

  create: (tripId: string, input: CreateExpenseInput) =>
    api.post<Expense>(`/trips/${tripId}/expenses`, input),

  update: (id: string, input: UpdateExpenseInput) =>
    api.put<Expense>(`/expenses/${id}`, input),

  delete: (id: string) => api.delete<void>(`/expenses/${id}`),
}
