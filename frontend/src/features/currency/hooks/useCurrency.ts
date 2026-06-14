"use client"

import { useQuery } from "@tanstack/react-query"
import { currencyApi } from "../api"

// Supported list rarely changes — long stale time.
export function useSupportedCurrencies() {
  return useQuery({
    queryKey: ["currency", "supported"],
    queryFn: () => currencyApi.supported(),
    staleTime: 60 * 60 * 1000,
  })
}

// Live conversion. Disabled when amount is 0 / inputs incomplete so we don't
// hammer the backend on every keystroke before user picks currencies.
export function useConvert(from: string, to: string, amount: number) {
  return useQuery({
    queryKey: ["currency", "convert", from, to, amount],
    queryFn: () => currencyApi.convert(from, to, amount),
    enabled: !!from && !!to && amount > 0,
    // Rate doesn't change per-keystroke; cache 5 min so debounced typing reuses.
    staleTime: 5 * 60 * 1000,
  })
}

export function useRates(base: string) {
  return useQuery({
    queryKey: ["currency", "rates", base],
    queryFn: () => currencyApi.rates(base),
    enabled: !!base,
    staleTime: 5 * 60 * 1000,
  })
}
