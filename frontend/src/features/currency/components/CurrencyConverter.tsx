"use client"

import { useId, useRef, useState } from "react"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import { useConvert, useSupportedCurrencies } from "../hooks/useCurrency"
import { MaterialIcon } from "@/components/MaterialIcon"
import { getCurrencyLabel } from "@/lib/currency"
import { CurrencyBadge } from "./CurrencyBadge"
import { cn } from "@/lib/utils"
import { useRecentConversionsStore } from "../store"

// Quick-preset amounts for fast conversion without typing.
const PRESETS = [1, 10, 100, 1000]

export function CurrencyConverter() {
  const { data: supported, isLoading: loadingList } = useSupportedCurrencies()
  const [from, setFrom] = useState("USD")
  const [to, setTo] = useState("IDR")
  const [amount, setAmount] = useState("1")
  const amountId = useId()

  const numericAmount = Number(amount)
  const { data: result, isLoading, isError } = useConvert(
    from,
    to,
    Number.isFinite(numericAmount) ? numericAmount : 0,
  )

  const addRecord = useRecentConversionsStore((s) => s.add)
  const records = useRecentConversionsStore((s) => s.records)
  const removeRecord = useRecentConversionsStore((s) => s.remove)
  const clearRecords = useRecentConversionsStore((s) => s.clear)
  // Track the last result we recorded to avoid duplicate entries while typing.
  const lastRecordedRef = useRef<string>("")

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

  // Exchange rate for 1 unit of `from` → `to` (for the explicit rate line).
  const rate = result?.rate
  const ratePerUnit = rate != null
    ? (1 * rate).toLocaleString(undefined, { maximumFractionDigits: 4 })
    : null

  // Record a successful conversion once per unique (from,to,amount) combo.
  if (
    result &&
    numericAmount > 0 &&
    result.converted_amount > 0 &&
    lastRecordedRef.current !== `${from}-${to}-${amount}`
  ) {
    lastRecordedRef.current = `${from}-${to}-${amount}`
    addRecord({
      from,
      to,
      amount: numericAmount,
      convertedAmount: result.converted_amount,
      rate: result.rate,
    })
  }

  return (
    <div className="flex flex-col gap-10">
      {/* Converter Interface */}
      <div className="relative flex flex-col md:flex-row items-center justify-center gap-3 md:gap-8">
        {/* From Card */}
        <div className="w-full md:flex-1 glass rounded-xl p-5 md:p-8 soft-shadow transition-all hover:border-primary/30">
          <Label htmlFor={amountId} className="text-label-sm font-label-sm text-muted-foreground uppercase tracking-wider mb-4 block">From</Label>
          <div className="flex items-center justify-between mb-6">
            <Select value={from} onValueChange={(v) => v && setFrom(v)}>
              <SelectTrigger className="w-auto max-w-full min-w-0 bg-muted border-none hover:bg-muted/80 transition-colors font-headline-sm text-headline-sm text-foreground px-4 py-2 rounded-lg">
                <div className="flex min-w-0 items-center gap-3">
                  <CurrencyBadge code={from} />
                  <span className="truncate">
                    {getCurrencyLabel(from, options.find(o => o.code === from)?.name)}
                  </span>
                </div>
              </SelectTrigger>
              <SelectContent>
                {options.map((o) => (
                  <SelectItem key={o.code} value={o.code}>
                    <CurrencyBadge code={o.code} className="mr-2 h-6 bg-muted" />
                    {getCurrencyLabel(o.code, o.name)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <input
            id={amountId}
            type="number"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            aria-label={`Amount in ${getCurrencyLabel(from, options.find(o => o.code === from)?.name)}`}
            maxLength={12}
            className="w-full min-w-0 bg-transparent border-none text-[28px] leading-[36px] md:text-display md:leading-[56px] font-display text-foreground focus:ring-0 p-0"
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
          className="swap-button z-10 flex h-12 w-12 md:h-14 md:w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-all duration-300 hover:shadow-xl rotate-90 md:rotate-0 md:hover:rotate-180 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 md:absolute md:left-1/2 md:-translate-x-1/2"
        >
          <MaterialIcon name="swap_horiz" size={28} />
        </button>

        {/* To Card */}
        <div className="w-full md:flex-1 glass rounded-xl p-5 md:p-8 soft-shadow transition-all hover:border-primary/30">
          <Label className="text-label-sm font-label-sm text-muted-foreground uppercase tracking-wider mb-4 block">To</Label>
          <div className="flex items-center justify-between mb-6">
            <Select value={to} onValueChange={(v) => v && setTo(v)}>
              <SelectTrigger className="w-auto max-w-full min-w-0 bg-muted border-none hover:bg-muted/80 transition-colors font-headline-sm text-headline-sm text-foreground px-4 py-2 rounded-lg">
                <div className="flex min-w-0 items-center gap-3">
                  <CurrencyBadge code={to} />
                  <span className="truncate">
                    {getCurrencyLabel(to, options.find(o => o.code === to)?.name)}
                  </span>
                </div>
              </SelectTrigger>
              <SelectContent>
                {options.map((o) => (
                  <SelectItem key={o.code} value={o.code}>
                    <CurrencyBadge code={o.code} className="mr-2 h-6 bg-muted" />
                    {getCurrencyLabel(o.code, o.name)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-full min-w-0 break-words bg-transparent border-none text-[28px] leading-[36px] md:text-display md:leading-[56px] font-display text-primary focus:ring-0 p-0" aria-live="polite">
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

      {/* Quick-preset amounts */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <span className="text-xs text-muted-foreground mr-1">Quick:</span>
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setAmount(String(p))}
            aria-label={`Set amount to ${p}`}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold tabular-nums transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              amount === String(p)
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {p.toLocaleString()}
          </button>
        ))}
      </div>

      {/* Explicit exchange rate line */}
      {ratePerUnit && (
        <p className="text-center text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">1 {from}</span>
          {" = "}
          <span className="font-semibold text-primary tabular-nums">{ratePerUnit} {to}</span>
        </p>
      )}

      {/* Recent Conversions */}
      <RecentConversions
        records={records}
        onRemove={removeRecord}
        onClear={clearRecords}
        onReuse={(r) => {
          setFrom(r.from)
          setTo(r.to)
          setAmount(String(r.amount))
        }}
      />
    </div>
  )
}

interface RecentConversionsProps {
  records: ReturnType<typeof useRecentConversionsStore.getState>["records"]
  onRemove: (id: string) => void
  onClear: () => void
  onReuse: (record: RecentConversionsProps["records"][number]) => void
}

function RecentConversions({
  records,
  onRemove,
  onClear,
  onReuse,
}: RecentConversionsProps) {
  if (records.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-outline-variant/60 p-8 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <MaterialIcon name="history" size={24} className="text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground">No recent conversions yet</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Your conversion history will appear here.
        </p>
      </div>
    )
  }

  return (
    <section aria-label="Recent conversions">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-headline-sm font-headline-sm text-foreground">
          Recent Conversions
        </h3>
        <button
          type="button"
          onClick={onClear}
          className="text-label-md font-label-md text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
        >
          Clear all
        </button>
      </div>
      <ul className="space-y-3">
        {records.map((r) => (
          <li
            key={r.id}
            className="group flex items-center justify-between gap-4 rounded-lg border border-outline-variant bg-surface-container-lowest p-4 transition-all hover:border-primary/20"
          >
            <button
              type="button"
              onClick={() => onReuse(r)}
              className="flex flex-1 items-center gap-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
              aria-label={`Reuse conversion ${r.amount} ${r.from} to ${r.to}`}
            >
              <div className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-container-high transition-colors group-hover:bg-primary-fixed">
                <MaterialIcon
                  name="history"
                  size={20}
                  className="text-muted-foreground group-hover:text-primary"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="break-words text-body-md font-body-md text-foreground">
                  <span className="tabular-nums">
                    {r.amount.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                  </span>{" "}
                  {r.from}
                  <span className="mx-1.5 text-muted-foreground">→</span>
                  <span className="tabular-nums text-primary">
                    {r.convertedAmount.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                  </span>{" "}
                  {r.to}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  1 {r.from} ={" "}
                  <span className="tabular-nums">
                    {r.rate.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                  </span>{" "}
                  {r.to}
                </p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => onRemove(r.id)}
              aria-label="Remove conversion"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
            >
              <MaterialIcon name="close" size={18} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
