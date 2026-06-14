"use client"

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { expenseApi } from "../api"
import type {
  CreateExpenseInput,
  UpdateExpenseInput,
} from "../types"

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
  })
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>, tripId: string) {
  qc.invalidateQueries({ queryKey: listKey(tripId) })
  qc.invalidateQueries({ queryKey: summaryKey(tripId) })
}

export function useCreateExpense(tripId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateExpenseInput) =>
      expenseApi.create(tripId, input),
    onSuccess: () => invalidateAll(qc, tripId),
  })
}

export function useUpdateExpense(id: string, tripId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateExpenseInput) => expenseApi.update(id, input),
    onSuccess: () => invalidateAll(qc, tripId),
  })
}

export function useDeleteExpense(tripId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => expenseApi.delete(id),
    onSuccess: () => invalidateAll(qc, tripId),
  })
}
