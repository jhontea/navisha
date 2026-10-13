"use client"

import { useEffect, useRef, useState } from "react"
import { Sparkles, Send, ChevronDown, RefreshCw, AlertCircle, X } from "lucide-react"
import { useSupportedCurrencies } from "@/features/currency/hooks/useCurrency"
import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"
import { TravelDateRangePicker } from "./TravelDateRangePicker"
import type { GenerateTripInput } from "../types"

const MAX_DAYS = 10
const MAX_DESTINATION = 60
const MAX_DESCRIPTION = 100

// Quick-start prompt chips for the description step. Reduces cold-start
// friction: users tap a style instead of typing from scratch. Values are kept
// short so 2-3 chips can combine within MAX_DESCRIPTION.
const PROMPT_CHIPS: { label: string; value: string }[] = [
  { label: "🍜 Foodie", value: "foodie, local cuisine" },
  { label: "🏔️ Adventure", value: "adventure, outdoor activities" },
  { label: "💰 Budget", value: "budget-friendly" },
  { label: "🎭 Cultural", value: "cultural, historical sites" },
  { label: "👨‍👩‍👧 Family", value: "family-friendly" },
  { label: "💎 Hidden gems", value: "hidden gems, off the beaten path" },
  { label: "🏖️ Relaxing", value: "relaxing, beaches" },
  { label: "🌃 Nightlife", value: "nightlife and entertainment" },
]

// Steps in the conversation. Each maps to one field of GenerateTripInput.
type StepId = "destination" | "description" | "dates" | "currency" | "review"

interface ChatMessage {
  from: "bot" | "user"
  text: string
}

interface Props {
  onSubmit: (input: GenerateTripInput) => void
  disabled?: boolean
  initialValues?: Partial<GenerateTripInput>
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
export function GenerateChatWizard({ onSubmit, disabled, initialValues }: Props) {
  const { data: currencyData } = useSupportedCurrencies()
  const currencies = currencyData?.supported ?? []

  const [step, setStep] = useState<StepId>("destination")
  const [messages, setMessages] = useState<ChatMessage[]>([
    { from: "bot", text: "Hey! I'll help you build an itinerary. Where would you like to go?" },
  ])

  // Collected values
  const [destination, setDestination] = useState(initialValues?.destination ?? "")
  const [description, setDescription] = useState("")
  const [startDate, setStartDate] = useState(initialValues?.start_date ?? "")
  const [endDate, setEndDate] = useState(initialValues?.end_date ?? "")
  const [currency, setCurrency] = useState(initialValues?.base_currency ?? "IDR")

  // Current input field bindings
  const [draftText, setDraftText] = useState(initialValues?.destination ?? "")
  const [error, setError] = useState<string | null>(null)

  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages, step])

  const pushBot = (text: string) => setMessages((m) => [...m, { from: "bot", text }])
  const pushUser = (text: string) => setMessages((m) => [...m, { from: "user", text }])

  const span = daySpan(startDate, endDate)
  const hasDraftText = draftText.trim().length > 0

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

  // Append a prompt chip value to the description input. If the input is
  // empty, use the value directly; otherwise join with ", " so multiple
  // styles can combine (e.g. "foodie, budget-friendly"). Respects MAX_DESCRIPTION.
  const handleChipClick = (value: string) => {
    setError(null)
    const current = draftText.trim()
    const next = current ? `${current}, ${value}` : value
    if (next.length > MAX_DESCRIPTION) return
    setDraftText(next)
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

  // Step progress indicator
  const STEPS: StepId[] = ["destination", "description", "dates", "currency", "review"]
  const stepIdx = STEPS.indexOf(step)

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      {/* Progress bar */}
      <div className="h-1 bg-muted">
        <div
          className="h-full bg-primary transition-all duration-500"
          style={{ width: `${((stepIdx + 1) / STEPS.length) * 100}%` }}
        />
      </div>

      {/* Chat transcript */}
      <div ref={scrollRef} className="max-h-[360px] overflow-y-auto p-5 space-y-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex items-end gap-2 ${m.from === "user" ? "justify-end" : "justify-start"}`}
          >
            {m.from === "bot" && (
              <div className="mb-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              </div>
            )}
            <div
              className={`max-w-[78%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                m.from === "user"
                  ? "rounded-br-sm bg-primary text-primary-foreground"
                  : "rounded-bl-sm bg-muted text-foreground"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
      </div>

      {/* Input area — changes per step */}
      {step !== "review" && (
        <div className="space-y-3 border-t p-4">
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
                onKeyDown={(e) => {
                  if (e.key === "Enter" && hasDraftText) handleDestination()
                }}
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{draftText.length}/{MAX_DESTINATION}</span>
                <button type="button" onClick={handleDestination} disabled={!hasDraftText} className={sendBtn}>
                  <Send className="h-3.5 w-3.5" aria-hidden="true" />
                  Send
                </button>
              </div>
            </div>
          )}

          {step === "description" && (
            <div className="space-y-2">
              <div className="relative">
                <input
                  autoFocus
                  className={cn(inputBase, draftText.length > 0 && "pr-9")}
                  placeholder="e.g. foodie, adventure, budget-friendly"
                  maxLength={MAX_DESCRIPTION}
                  value={draftText}
                  onChange={(e) => setDraftText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && hasDraftText) handleDescription(false)
                  }}
                />
                {draftText.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setDraftText("")
                      setError(null)
                    }}
                    className="absolute right-2.5 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    aria-label="Clear input"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {PROMPT_CHIPS.map((chip) => (
                  <button
                    key={chip.value}
                    type="button"
                    onClick={() => handleChipClick(chip.value)}
                    className="rounded-full border border-border/40 bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {hasDraftText
                    ? `${draftText.length}/${MAX_DESCRIPTION}`
                    : "Choose a suggestion, type your own, or Skip"}
                </span>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => handleDescription(true)} className={ghostBtn}>
                    Skip
                  </button>
                  <button type="button" onClick={() => handleDescription(false)} disabled={!hasDraftText} className={sendBtn}>
                    <Send className="h-3.5 w-3.5" aria-hidden="true" />
                    Send
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === "dates" && (
            <div className="space-y-3">
              <TravelDateRangePicker
                startDate={startDate}
                endDate={endDate}
                duration={span || null}
                hasError={Boolean(error)}
                onChange={(range) => {
                  setStartDate(range.startDate)
                  setEndDate(range.endDate)
                  setError(null)
                }}
              />
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
        <div className="space-y-4 border-t p-5">
          <div className="space-y-2 rounded-lg bg-muted/50 p-4 text-sm">
            <Recap label="Destination" value={destination} />
            {description && <Recap label="Preferences" value={description} />}
            <Recap label="Dates" value={`${startDate} → ${endDate} (${span} day${span > 1 ? "s" : ""})`} />
            <Recap label="Currency" value={currency} />
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button size="lg" onClick={handleGenerate} disabled={disabled}>
              <Sparkles aria-hidden="true" />
              Generate itinerary
            </Button>
            <Button variant="outline" size="lg" onClick={restart} disabled={disabled}>
              <RefreshCw aria-hidden="true" />
              Start over
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

const sendBtn = buttonVariants()
const ghostBtn = buttonVariants({ variant: "ghost", className: "text-muted-foreground" })

function Recap({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <span className="w-24 shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 font-medium text-foreground">{value}</span>
    </div>
  )
}
