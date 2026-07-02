"use client"

import { useState } from "react"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useConvert, useSupportedCurrencies } from "../hooks/useCurrency"
import { MaterialIcon } from "@/components/MaterialIcon"
import { getCurrencyLabel } from "@/lib/currency"

export function CurrencyConverter() {
  const { data: supported, isLoading: loadingList } = useSupportedCurrencies()
  const [from, setFrom] = useState("USD")
  const [to, setTo] = useState("IDR")
  const [amount, setAmount] = useState("1")

  const numericAmount = Number(amount)
  const { data: result, isLoading, isError } = useConvert(
    from,
    to,
    Number.isFinite(numericAmount) ? numericAmount : 0,
  )

  const swap = () => {
    setFrom(to)
    setTo(from)
  }

  if (loadingList) {
    return <p className="text-sm text-muted-foreground">Loading currencies…</p>
  }

  const options = supported?.supported ?? []

  if (isError) {
    return (
      <div className="text-center text-sm text-destructive">
        <p>Failed to load conversion rate. Please try again.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="mb-12 text-center">
        <h1 className="text-headline-lg font-headline-lg text-gradient-sunset mb-2">Currency Converter</h1>
        <p className="text-muted-foreground font-body-md">Real-time exchange rates for your next adventure.</p>
      </div>

      {/* Converter Interface */}
      <div className="relative flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8">
        {/* From Card */}
        <div className="w-full md:flex-1 glass rounded-xl p-8 soft-shadow transition-all hover:border-primary/30">
          <Label className="text-label-sm font-label-sm text-muted-foreground uppercase tracking-wider mb-4 block">From</Label>
          <div className="flex items-center justify-between mb-6">
            <Select value={from} onValueChange={(v) => v && setFrom(v)}>
              <SelectTrigger className="w-auto bg-muted border-none hover:bg-muted/80 transition-colors font-headline-sm text-headline-sm text-foreground px-4 py-2 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-6 rounded-sm bg-primary/10 flex items-center justify-center">
                    <MaterialIcon name="flag" size={18} className="text-primary" />
                  </div>
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                {options.map((o) => (
                  <SelectItem key={o.code} value={o.code}>
                    {getCurrencyLabel(o.code, o.name)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <input
            type="number"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full bg-transparent border-none text-display font-display text-foreground focus:ring-0 p-0"
          />
          <p className="text-label-md font-label-md text-outline mt-2">
            {getCurrencyLabel(from, options.find(o => o.code === from)?.name)}
          </p>
        </div>

        {/* Swap Button */}
        <button
          type="button"
          onClick={swap}
          aria-label="Swap currencies"
          className="swap-button z-10 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary via-chromatic-aurora to-chromatic-ocean text-white shadow-lg shadow-primary/25 transition-all duration-300 hover:shadow-xl hover:shadow-primary/35 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 md:absolute md:left-1/2 md:-translate-x-1/2 [&_.material-symbols-outlined]:text-white"
        >
          <MaterialIcon name="swap_horiz" size={28} />
        </button>

        {/* To Card */}
        <div className="w-full md:flex-1 glass rounded-xl p-8 soft-shadow transition-all hover:border-primary/30">
          <Label className="text-label-sm font-label-sm text-muted-foreground uppercase tracking-wider mb-4 block">To</Label>
          <div className="flex items-center justify-between mb-6">
            <Select value={to} onValueChange={(v) => v && setTo(v)}>
              <SelectTrigger className="w-auto bg-muted border-none hover:bg-muted/80 transition-colors font-headline-sm text-headline-sm text-foreground px-4 py-2 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-6 rounded-sm bg-tertiary/10 flex items-center justify-center">
                    <MaterialIcon name="flag" size={18} className="text-tertiary" />
                  </div>
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                {options.map((o) => (
                  <SelectItem key={o.code} value={o.code}>
                    {getCurrencyLabel(o.code, o.name)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-full bg-transparent border-none text-display font-display text-primary focus:ring-0 p-0">
            {isLoading ? (
              <p className="text-muted-foreground">Converting...</p>
            ) : result ? (
              <p className="text-primary">
                {result.converted_amount.toLocaleString(undefined, {
                  maximumFractionDigits: 4,
                })}
              </p>
            ) : (
              <p className="text-muted-foreground">0.00</p>
            )}
          </div>
          <p className="text-label-md font-label-md text-outline mt-2">
            {getCurrencyLabel(to, options.find(o => o.code === to)?.name)}
          </p>
        </div>
      </div>

    </div>
  )
}
