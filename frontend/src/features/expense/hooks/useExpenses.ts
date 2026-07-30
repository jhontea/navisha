"use client"

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { expenseApi } from "../api"
import type {
  CreateExpenseInput,
  Expense,
  ExpenseListResponse,
  ExpenseSummary,
  UpdateExpenseInput,
} from "../types"
import type { TripOverviewResponse } from "@/features/trip/overview"

const listKey = (tripId: string) => ["expenses", "list", tripId] as const
const summaryKey = (tripId: string) =>
  ["expenses", "summary", tripId] as const

export function useExpenses(tripId: string) {
  return useQuery({
    queryKey: listKey(tripId),
    queryFn: () => expenseApi.list(tripId),
    enabled: !!tripId,
  })
}

export function useExpenseSummary(tripId: string) {
  return useQuery({
    queryKey: summaryKey(tripId),
    queryFn: () => expenseApi.summary(tripId),
    enabled: !!tripId,
    staleTime: 5 * 60 * 1000,
  })
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>, tripId: string) {
  qc.invalidateQueries({ queryKey: listKey(tripId), refetchType: "none" })
  qc.invalidateQueries({ queryKey: summaryKey(tripId), refetchType: "none" })
  qc.invalidateQueries({ queryKey: ["trips", "overview", tripId], refetchType: "none" })
}

export function useCreateExpense(tripId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateExpenseInput) =>
      expenseApi.create(tripId, input),
    onSuccess: (created) => {
      qc.setQueryData<ExpenseListResponse>(listKey(tripId), (current) => ({
        items: current ? [created, ...current.items] : [created],
      }))
      updateExpenseSummaries(qc, tripId, undefined, created)
      invalidateAll(qc, tripId)
    },
  })
}

export function useUpdateExpense(id: string, tripId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateExpenseInput) => expenseApi.update(id, input),
    onSuccess: (updated) => {
      const previous = qc.getQueryData<ExpenseListResponse>(listKey(tripId))?.items.find((item) => item.id === updated.id)
      qc.setQueryData<ExpenseListResponse>(listKey(tripId), (current) =>
        current ? { items: current.items.map((item) => item.id === updated.id ? updated : item) } : current,
      )
      updateExpenseSummaries(qc, tripId, previous, updated)
      invalidateAll(qc, tripId)
    },
  })
}

export function useDeleteExpense(tripId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => expenseApi.delete(id),
    onSuccess: (_, deletedId) => {
      const previous = qc.getQueryData<ExpenseListResponse>(listKey(tripId))?.items.find((item) => item.id === deletedId)
      qc.setQueryData<ExpenseListResponse>(listKey(tripId), (current) =>
        current ? { items: current.items.filter((item) => item.id !== deletedId) } : current,
      )
      updateExpenseSummaries(qc, tripId, previous, undefined)
      invalidateAll(qc, tripId)
    },
  })
}

function patchSummary(summary: ExpenseSummary, previous?: Expense, next?: Expense): ExpenseSummary {
  const totals = new Map(summary.by_category.map((item) => [item.category, item.total]))
  if (previous) totals.set(previous.category, Math.max(0, (totals.get(previous.category) ?? 0) - previous.converted_amount))
  if (next) totals.set(next.category, (totals.get(next.category) ?? 0) + next.converted_amount)
  return {
    ...summary,
    total_base: Math.max(0, summary.total_base - (previous?.converted_amount ?? 0) + (next?.converted_amount ?? 0)),
    by_category: Array.from(totals, ([category, total]) => ({ category, total })).filter((item) => item.total > 0),
  }
}

function updateExpenseSummaries(
  qc: ReturnType<typeof useQueryClient>,
  tripId: string,
  previous?: Expense,
  next?: Expense,
) {
  qc.setQueryData<ExpenseSummary>(summaryKey(tripId), (current) =>
    current ? patchSummary(current, previous, next) : current,
  )
  qc.setQueryData<TripOverviewResponse>(["trips", "overview", tripId], (current) =>
    current
      ? { ...current, expense_summary: patchSummary(current.expense_summary, previous, next) }
      : current,
  )
}
