"use client"

import { useState } from "react"
import { ArrowLeftRight } from "lucide-react"
import { Input } from "@/components/ui/input"
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

export function CurrencyConverter() {
  const { data: supported, isLoading: loadingList } = useSupportedCurrencies()
  const [from, setFrom] = useState("USD")
  const [to, setTo] = useState("IDR")
  const [amount, setAmount] = useState("100")

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

  return (
    <div className="flex flex-col gap-4 rounded-lg border bg-card p-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
        <CurrencySide
          label="From"
          currency={from}
          onCurrencyChange={setFrom}
          amount={amount}
          onAmountChange={setAmount}
          options={options}
          readOnly={false}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={swap}
          aria-label="Swap currencies"
          className="h-9 w-9 self-center p-0"
        >
          <ArrowLeftRight className="h-4 w-4" />
        </Button>
        <CurrencySide
          label="To"
          currency={to}
          onCurrencyChange={setTo}
          amount={
            result
              ? result.converted_amount.toLocaleString(undefined, {
                  maximumFractionDigits: 4,
                })
              : ""
          }
          onAmountChange={() => {}}
          options={options}
          readOnly
        />
      </div>

      <div className="text-xs text-muted-foreground">
        {isLoading && "Converting…"}
        {isError && <span className="text-destructive">Conversion failed.</span>}
        {result && (
          <span>
            1 {result.from} ={" "}
            {result.rate.toLocaleString(undefined, { maximumFractionDigits: 6 })}{" "}
            {result.to}
          </span>
        )}
      </div>
    </div>
  )
}

interface SideProps {
  label: string
  currency: string
  onCurrencyChange: (v: string) => void
  amount: string
  onAmountChange: (v: string) => void
  options: { code: string; symbol: string }[]
  readOnly: boolean
}

function CurrencySide({
  label,
  currency,
  onCurrencyChange,
  amount,
  onAmountChange,
  options,
  readOnly,
}: SideProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input
          type="number"
          inputMode="decimal"
          value={amount}
          onChange={(e) => onAmountChange(e.target.value)}
          readOnly={readOnly}
          placeholder="0"
          className="flex-1"
        />
        <Select
          value={currency}
          onValueChange={(v) => v && onCurrencyChange(v)}
        >
          <SelectTrigger className="w-24">
            <SelectValue />
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
    </div>
  )
}
