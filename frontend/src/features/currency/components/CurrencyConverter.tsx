"use client"

import { useEffect, useId, useState } from "react"
import { ArrowLeftRight, ArrowUpDown, History, X } from "lucide-react"

import { Chip } from "@/components/Chip"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import { getCurrencyLabel } from "@/lib/currency"

import { useConvert, useSupportedCurrencies } from "../hooks/useCurrency"
import { useRecentConversionsStore, type ConversionRecord } from "../store"
import { CurrencyBadge } from "./CurrencyBadge"

// Quick-preset amounts for fast conversion without typing.
const PRESETS = [1, 10, 100, 1000]

// Wait this long after the last change before logging a conversion to history.
const RECORD_DELAY_MS = 1000

const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 4 })

type CurrencyOption = { code: string; name?: string }

function CurrencySelect({
  value,
  onChange,
  options,
  labelId,
}: {
  value: string
  onChange: (code: string) => void
  options: CurrencyOption[]
  labelId: string
}) {
  return (
    <Select value={value} onValueChange={(v) => v && onChange(v)}>
      <SelectTrigger aria-labelledby={labelId} className="w-full min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <CurrencyBadge code={value} />
          <span className="truncate">{getCurrencyLabel(value, options.find((o) => o.code === value)?.name)}</span>
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
  )
}

export function CurrencyConverter() {
  const { data: supported, isLoading: loadingList } = useSupportedCurrencies()
  const [from, setFrom] = useState("USD")
  const [to, setTo] = useState("IDR")
  const [amount, setAmount] = useState("1")
  const amountId = useId()
  const fromLabelId = useId()
  const toLabelId = useId()

  const numericAmount = Number(amount)
  const { data: result, isLoading, isError } = useConvert(
    from,
    to,
    Number.isFinite(numericAmount) ? numericAmount : 0,
  )

  const records = useRecentConversionsStore((s) => s.records)
  const addRecord = useRecentConversionsStore((s) => s.add)
  const removeRecord = useRecentConversionsStore((s) => s.remove)
  const clearRecords = useRecentConversionsStore((s) => s.clear)

  // Record the conversion once input has settled for 1s, so intermediate typing isn't logged.
  useEffect(() => {
    if (isError || !result || numericAmount <= 0 || result.converted_amount <= 0) return
    if (result.from !== from || result.to !== to || result.amount !== numericAmount) return
    const t = setTimeout(
      () => addRecord({ from, to, amount: numericAmount, convertedAmount: result.converted_amount, rate: result.rate }),
      RECORD_DELAY_MS,
    )
    return () => clearTimeout(t)
  }, [result, isError, from, to, numericAmount, addRecord])

  // Picking the currency already on the other side swaps the two instead of allowing from === to.
  const changeFrom = (code: string) => {
    if (code === to) setTo(from)
    setFrom(code)
  }
  const changeTo = (code: string) => {
    if (code === from) setFrom(to)
    setTo(code)
  }

  if (loadingList) {
    return <p className="text-sm text-muted-foreground">Loading currencies…</p>
  }
  if (isError) {
    return (
      <p className="text-sm text-destructive">Couldn&apos;t load exchange rates. Check your connection and try again.</p>
    )
  }

  const options = supported?.supported ?? []

  return (
    <div className="flex flex-col gap-8">
      <div className="rounded-3xl border bg-card p-5 shadow-card md:p-8">
        <div className="grid items-end gap-4 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
          <div className="flex min-w-0 flex-col gap-2">
            <Label id={fromLabelId}>From</Label>
            <CurrencySelect value={from} onChange={changeFrom} options={options} labelId={fromLabelId} />
            <Label htmlFor={amountId} className="sr-only">
              Amount in {from}
            </Label>
            <Input
              id={amountId}
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="h-14 rounded-xl font-display text-3xl font-extrabold tabular-nums"
            />
          </div>

          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => {
              setFrom(to)
              setTo(from)
            }}
            aria-label="Swap currencies"
            className="justify-self-center rounded-full md:mb-1"
          >
            <ArrowUpDown className="h-4 w-4 md:hidden" aria-hidden="true" />
            <ArrowLeftRight className="hidden h-4 w-4 md:block" aria-hidden="true" />
          </Button>

          <div className="flex min-w-0 flex-col gap-2">
            <Label id={toLabelId}>To</Label>
            <CurrencySelect value={to} onChange={changeTo} options={options} labelId={toLabelId} />
            <p
              className="flex h-14 items-center break-all rounded-xl bg-primary-soft px-4 font-display text-3xl font-extrabold tabular-nums text-primary-soft-foreground"
              aria-live="polite"
            >
              {isLoading ? <span className="text-base text-muted-foreground">Converting…</span> : fmt(result?.converted_amount ?? 0)}
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Quick amounts">
            {PRESETS.map((p) => (
              <Chip
                key={p}
                pressed={amount === String(p)}
                onClick={() => setAmount(String(p))}
                aria-label={`Set amount to ${p}`}
                className="tabular-nums"
              >
                {p.toLocaleString("en-US")}
              </Chip>
            ))}
          </div>
          {result?.rate != null && (
            <p className="text-sm text-muted-foreground">
              1 {from} = <span className="font-semibold tabular-nums text-foreground">{fmt(result.rate)}</span> {to}
            </p>
          )}
        </div>
      </div>

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

function RecentConversions({
  records,
  onRemove,
  onClear,
  onReuse,
}: {
  records: ConversionRecord[]
  onRemove: (id: string) => void
  onClear: () => void
  onReuse: (record: ConversionRecord) => void
}) {
  return (
    <section aria-labelledby="recent-conversions-heading">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id="recent-conversions-heading" className="font-display text-xl font-extrabold text-foreground">
          Recent conversions
        </h2>
        {records.length > 0 && (
          <Button type="button" variant="link" size="sm" onClick={onClear}>
            Clear all
          </Button>
        )}
      </div>
      {records.length === 0 ? (
        <p className="flex items-center gap-2 rounded-2xl bg-muted p-4 text-sm text-muted-foreground">
          <History className="h-4 w-4 shrink-0" aria-hidden="true" />
          Conversions you make appear here.
        </p>
      ) : (
        <ul className="divide-y rounded-2xl border bg-card shadow-card">
          {records.map((r) => (
            <li key={r.id} className="flex items-center gap-2 pr-2">
              {/* eslint-disable-next-line no-restricted-syntax -- whole-row button to reuse a past conversion */}
              <button
                type="button"
                onClick={() => onReuse(r)}
                className="min-w-0 flex-1 rounded-xl px-4 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`Reuse conversion ${r.amount} ${r.from} to ${r.to}`}
              >
                <p className="wrap-break-word text-sm text-foreground">
                  <span className="tabular-nums">{fmt(r.amount)}</span> {r.from}
                  <span className="mx-1.5 text-muted-foreground">→</span>
                  <span className="font-semibold tabular-nums">{fmt(r.convertedAmount)}</span> {r.to}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  1 {r.from} = <span className="tabular-nums">{fmt(r.rate)}</span> {r.to}
                </p>
              </button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => onRemove(r.id)}
                aria-label="Remove conversion"
                className="shrink-0 text-muted-foreground hover:text-destructive"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
