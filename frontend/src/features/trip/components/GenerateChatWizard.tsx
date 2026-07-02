"use client"

import { useEffect, useRef, useState } from "react"
import { Sparkles, Send, ChevronDown, RefreshCw, AlertCircle } from "lucide-react"
import { useSupportedCurrencies } from "@/features/currency/hooks/useCurrency"
import type { GenerateTripInput } from "../types"

const MAX_DAYS = 10
const MAX_DESTINATION = 60
const MAX_DESCRIPTION = 100

// Steps in the conversation. Each maps to one field of GenerateTripInput.
type StepId = "destination" | "description" | "dates" | "currency" | "review"

interface ChatMessage {
  from: "bot" | "user"
  text: string
}

interface Props {
  onSubmit: (input: GenerateTripInput) => void
  disabled?: boolean
}

function daySpan(start: string, end: string): number {
  if (!start || !end) return 0
  const s = new Date(start)
  const e = new Date(end)
  const diff = Math.round((e.getTime() - s.getTime()) / 86400000) + 1
  return diff > 0 ? diff : 0
}

const inputBase = "input-base"

// GenerateChatWizard collects the auto-generate inputs through a guided,
// chat-style flow. Each answer becomes a bubble; the final step shows a recap
// plus the Generate button. State is held locally and emitted via onSubmit.
export function GenerateChatWizard({ onSubmit, disabled }: Props) {
  const { data: currencyData } = useSupportedCurrencies()
  const currencies = currencyData?.supported ?? []

  const [step, setStep] = useState<StepId>("destination")
  const [messages, setMessages] = useState<ChatMessage[]>([
    { from: "bot", text: "Hey! I'll help you build an itinerary. Where would you like to go?" },
  ])

  // Collected values
  const [destination, setDestination] = useState("")
  const [description, setDescription] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [currency, setCurrency] = useState("IDR")

  // Current input field bindings
  const [draftText, setDraftText] = useState("")
  const [error, setError] = useState<string | null>(null)

  const endDateRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages, step])

  const pushBot = (text: string) => setMessages((m) => [...m, { from: "bot", text }])
  const pushUser = (text: string) => setMessages((m) => [...m, { from: "user", text }])

  const span = daySpan(startDate, endDate)

  const handleDestination = () => {
    const v = draftText.trim()
    if (!v) {
      setError("Please enter a destination first.")
      return
    }
    setError(null)
    setDestination(v)
    pushUser(v)
    setDraftText("")
    setStep("description")
    pushBot("Nice! Now tell me about your travel style or preferences (optional). For example: foodie, adventure, budget-friendly, cultural.")
  }

  const handleDescription = (skip: boolean) => {
    const v = skip ? "" : draftText.trim()
    setError(null)
    setDescription(v)
    pushUser(skip || !v ? "(skip)" : v)
    setDraftText("")
    setStep("dates")
    pushBot("Got it! When is your trip? (up to 10 days)")
  }

  const handleDates = () => {
    if (!startDate || !endDate) {
      setError("Please select both start and end dates.")
      return
    }
    if (span === 0) {
      setError("End date must be on or after the start date.")
      return
    }
    if (span > MAX_DAYS) {
      setError(`Maximum ${MAX_DAYS} days (currently ${span} days).`)
      return
    }
    setError(null)
    pushUser(`${startDate} → ${endDate} (${span} days)`)
    setStep("currency")
    pushBot("Last one — which currency would you like to use for budget estimates?")
  }

  const handleCurrency = () => {
    setError(null)
    pushUser(currency)
    setStep("review")
    pushBot("All set! Here's a recap. If it looks good, click Generate Itinerary.")
  }

  const handleGenerate = () => {
    if (disabled) return
    onSubmit({
      destination,
      description,
      start_date: startDate,
      end_date: endDate,
      base_currency: currency,
    })
  }

  const restart = () => {
    setStep("destination")
    setMessages([{ from: "bot", text: "Hey! I'll help you build an itinerary. Where would you like to go?" }])
    setDestination("")
    setDescription("")
    setStartDate("")
    setEndDate("")
    setCurrency("IDR")
    setDraftText("")
    setError(null)
  }

  const openPicker = (e: React.MouseEvent<HTMLInputElement>) => {
    try {
      e.currentTarget.showPicker?.()
    } catch {
      // native fallback
    }
  }

  // Step progress indicator
  const STEPS: StepId[] = ["destination", "description", "dates", "currency", "review"]
  const stepIdx = STEPS.indexOf(step)

  return (
    <div className="glass rounded-2xl overflow-hidden">
      {/* Progress bar */}
      <div className="h-1 bg-border/30">
        <div
          className="h-full bg-gradient-to-r from-primary to-chromatic-aurora transition-all duration-500"
          style={{ width: `${((stepIdx + 1) / STEPS.length) * 100}%` }}
        />
      </div>

      {/* Chat transcript */}
      <div ref={scrollRef} className="max-h-[360px] overflow-y-auto p-5 space-y-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex items-end gap-2 ${m.from === "user" ? "justify-end" : "justify-start"}`}
            style={{ animation: "fadeSlide 0.3s ease-out" }}
          >
            {m.from === "bot" && (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 mb-0.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              </div>
            )}
            <div
              className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                m.from === "user"
                  ? "bg-primary text-white rounded-br-sm shadow-sm shadow-primary/20"
                  : "bg-muted/60 text-foreground rounded-bl-sm border border-border/30"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
      </div>

      {/* Input area — changes per step */}
      {step !== "review" && (
        <div className="border-t border-border/20 bg-background/50 p-4 space-y-3">
          {error && (
            <p className="flex items-center gap-1.5 text-xs text-destructive">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {error}
            </p>
          )}

          {step === "destination" && (
            <div className="space-y-2">
              <input
                autoFocus
                className={inputBase}
                placeholder="e.g. Tokyo, Japan"
                maxLength={MAX_DESTINATION}
                value={draftText}
                onChange={(e) => setDraftText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleDestination()}
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{draftText.length}/{MAX_DESTINATION}</span>
                <button type="button" onClick={handleDestination} className={sendBtn}>
                  <Send className="h-3.5 w-3.5" aria-hidden="true" />
                  Send
                </button>
              </div>
            </div>
          )}

          {step === "description" && (
            <div className="space-y-2">
              <input
                autoFocus
                className={inputBase}
                placeholder="e.g. foodie, adventure, budget-friendly"
                maxLength={MAX_DESCRIPTION}
                value={draftText}
                onChange={(e) => setDraftText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleDescription(false)}
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{draftText.length}/{MAX_DESCRIPTION}</span>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => handleDescription(true)} className={ghostBtn}>
                    Skip
                  </button>
                  <button type="button" onClick={() => handleDescription(false)} className={sendBtn}>
                    <Send className="h-3.5 w-3.5" aria-hidden="true" />
                    Send
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === "dates" && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Date Range</label>
                <div className="flex rounded-lg border border-border focus-within:border-primary focus-within:ring-1 focus-within:ring-primary overflow-hidden bg-background">
                  <input
                    type="date"
                    className="flex-1 min-w-0 px-3 py-3 font-body-md text-body-md text-foreground bg-transparent border-none outline-none rounded-none [color-scheme:light]"
                    value={startDate}
                    onClick={openPicker}
                    onChange={(e) => {
                      setStartDate(e.target.value)
                      setTimeout(() => endDateRef.current?.showPicker?.(), 100)
                    }}
                  />
                  <span className="flex items-center text-foreground-variant/30 text-sm px-0.5 select-none">—</span>
                  <input
                    ref={endDateRef}
                    type="date"
                    className="flex-1 min-w-0 px-3 py-3 font-body-md text-body-md text-foreground bg-transparent border-none outline-none rounded-none [color-scheme:light]"
                    value={endDate}
                    min={startDate || undefined}
                    onClick={openPicker}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-medium ${span > MAX_DAYS ? "text-destructive" : "text-muted-foreground"}`}>
                  {span > 0 ? `${span} day${span > 1 ? "s" : ""}` : "Select date range"}
                  {span > MAX_DAYS && ` — max ${MAX_DAYS}`}
                </span>
                <button type="button" onClick={handleDates} className={sendBtn}>
                  <Send className="h-3.5 w-3.5" aria-hidden="true" />
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === "currency" && (
            <div className="space-y-2">
              <div className="relative">
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className={`${inputBase} appearance-none pr-10`}
                >
                  {currencies.length === 0 ? (
                    <option value="IDR">IDR</option>
                  ) : (
                    currencies.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code} - {c.name ?? c.code}
                      </option>
                    ))
                  )}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </div>
              <div className="flex justify-end">
                <button type="button" onClick={handleCurrency} className={sendBtn}>
                  <Send className="h-3.5 w-3.5" aria-hidden="true" />
                  Continue
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Review / generate */}
      {step === "review" && (
        <div className="border-t border-border/20 bg-background/50 p-5 space-y-4">
          <div className="rounded-xl border border-border/30 bg-muted/30 p-4 space-y-2 text-sm">
            <Recap label="Destination" value={destination} />
            {description && <Recap label="Preferences" value={description} />}
            <Recap label="Dates" value={`${startDate} → ${endDate} (${span} day${span > 1 ? "s" : ""})`} />
            <Recap label="Currency" value={currency} />
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Generate button with shimmer/spark effect */}
            <button
              type="button"
              onClick={handleGenerate}
              disabled={disabled}
              className="relative flex flex-1 sm:flex-initial items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-primary via-primary to-chromatic-aurora px-8 py-3.5 text-sm font-semibold text-white shadow-md shadow-primary/30 transition-all hover:shadow-lg hover:shadow-primary/40 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              {/* Shimmer sweep animation */}
              <span
                className="pointer-events-none absolute inset-0 animate-[shimmer-sweep_2.5s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/25 to-transparent"
                aria-hidden="true"
              />
              <Sparkles className="h-4 w-4 shrink-0" aria-hidden="true" />
              Generate Itinerary
            </button>
            <button
              type="button"
              onClick={restart}
              disabled={disabled}
              className="flex items-center justify-center gap-1.5 rounded-2xl border border-border/50 px-6 py-3.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-muted disabled:opacity-60"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              Start Over
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const sendBtn =
  "inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary/90 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
const ghostBtn =
  "rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"

function Recap({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <span className="text-muted-foreground min-w-[80px] shrink-0">{label}</span>
      <span className="text-foreground font-semibold">{value}</span>
    </div>
  )
}
