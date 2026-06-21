"use client"

import { useState } from "react"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useConvert, useSupportedCurrencies } from "../hooks/useCurrency"

// Material Symbols icon component
function MaterialIcon({ name, size = 24, className = "" }: { name: string; size?: number; className?: string }) {
  return (
    <span
      className={`material-symbols-outlined ${className}`}
      style={{ fontSize: size }}
      data-icon={name}
    >
      {name}
    </span>
  )
}

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

  // Debug: log when result changes
  if (result) {
    console.log("Result updated:", result)
  }

  if (loadingList) {
    return <p className="text-sm text-muted-foreground">Loading currencies…</p>
  }

  const options = supported?.supported ?? []

  // Show error if conversion fails
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
        <h1 className="text-headline-lg font-headline-lg text-on-background mb-2">Currency Converter</h1>
        <p className="text-on-surface-variant font-body-md">Real-time exchange rates for your next adventure.</p>
      </div>

      {/* Converter Interface */}
      <div className="relative flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8">
        {/* From Card */}
        <div className="w-full md:flex-1 bg-surface-container-lowest rounded-xl p-8 border border-outline-variant soft-shadow transition-all hover:border-primary/30">
          <Label className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider mb-4 block">From</Label>
          <div className="flex items-center justify-between mb-6">
            <Select value={from} onValueChange={(v) => v && setFrom(v)}>
              <SelectTrigger className="w-auto bg-surface-container-low border-none hover:bg-surface-container-high transition-colors font-headline-sm text-headline-sm text-on-surface px-4 py-2 rounded-lg">
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
                    {o.code}
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
            className="w-full bg-transparent border-none text-display font-display text-on-surface focus:ring-0 p-0"
          />
          <p className="text-label-md font-label-md text-outline mt-2">
            {options.find(o => o.code === from)?.name || from}
          </p>
        </div>

        {/* Swap Button */}
        <Button
          variant="default"
          size="sm"
          onClick={swap}
          aria-label="Swap currencies"
          className="swap-button z-10 w-14 h-14 bg-primary text-on-primary rounded-full flex items-center justify-center shadow-lg hover:bg-primary-container transition-all duration-300 md:absolute md:left-1/2 md:-translate-x-1/2"
        >
          <MaterialIcon name="swap_horiz" size={28} />
        </Button>

        {/* To Card */}
        <div className="w-full md:flex-1 bg-surface-container-lowest rounded-xl p-8 border border-outline-variant soft-shadow transition-all hover:border-primary/30">
          <Label className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider mb-4 block">To</Label>
          <div className="flex items-center justify-between mb-6">
            <Select value={to} onValueChange={(v) => v && setTo(v)}>
              <SelectTrigger className="w-auto bg-surface-container-low border-none hover:bg-surface-container-high transition-colors font-headline-sm text-headline-sm text-on-surface px-4 py-2 rounded-lg">
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
                    {o.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-full bg-transparent border-none text-display font-display text-primary focus:ring-0 p-0">
            {isLoading ? (
              <p className="text-on-surface-variant">Converting...</p>
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
            {options.find(o => o.code === to)?.name || to}
          </p>
        </div>
      </div>

    </div>
  )
}
