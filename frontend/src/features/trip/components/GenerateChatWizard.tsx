"use client"

import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/NativeSelect"
import { Chip } from "@/components/Chip"
import { useEffect, useRef, useState } from "react"
import { Sparkles, Send, ChevronDown, RefreshCw, AlertCircle, X } from "lucide-react"
import { useSupportedCurrencies } from "@/features/currency/hooks/useCurrency"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { TravelDateRangePicker } from "./TravelDateRangePicker"
import type { GenerateTripInput } from "../types"

const MAX_DAYS = 10
const MAX_DESTINATION = 60
const MAX_DESCRIPTION = 100

// Quick-start prompt chips for the description step. Reduces cold-start
// friction: users tap a style instead of typing from scratch. Values are kept
// short so 2-3 chips can combine within MAX_DESCRIPTION.
const PROMPT_CHIPS: { label: string; value: string }[] = [
  { label: "Local food", value: "local food and markets" },
  { label: "Outdoors", value: "outdoor activities and nature" },
  { label: "On a budget", value: "budget-friendly" },
  { label: "Culture & history", value: "cultural and historical sites" },
  { label: "With kids", value: "family-friendly, with kids" },
  { label: "Off the main sights", value: "quieter places away from the main tourist sights" },
  { label: "Slow pace", value: "relaxed pace, fewer stops per day" },
  { label: "Nightlife", value: "nightlife and evening entertainment" },
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
    // No overflow-hidden here: the date picker's calendar drops below the card.
    <div className="rounded-xl border bg-card">
      {/* Progress bar, inset so it needs no clipping by the card */}
      <div className="mx-5 mt-4 h-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
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
              <Input
                autoFocus
                className={"h-auto " + inputBase}
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
                <Button type="button" onClick={handleDestination} disabled={!hasDraftText}>
                  <Send className="h-3.5 w-3.5" aria-hidden="true" />
                  Send
                </Button>
              </div>
            </div>
          )}

          {step === "description" && (
            <div className="space-y-2">
              <div className="relative">
                <Input
                  autoFocus
                  className={cn("h-auto", inputBase, draftText.length > 0 && "pr-9")}
                  placeholder="e.g. foodie, adventure, budget-friendly"
                  maxLength={MAX_DESCRIPTION}
                  value={draftText}
                  onChange={(e) => setDraftText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && hasDraftText) handleDescription(false)
                  }}
                />
                {draftText.length > 0 && (
                  <Button
                    type="button"
                    onClick={() => {
                      setDraftText("")
                      setError(null)
                    }}
                    aria-label="Clear input"
variant="ghost" size="icon-xs" className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {PROMPT_CHIPS.map((chip) => (
                  <Chip
                    key={chip.value}
                    onClick={() => handleChipClick(chip.value)}
                  >
                    {chip.label}
                  </Chip>
                ))}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {hasDraftText
                    ? `${draftText.length}/${MAX_DESCRIPTION}`
                    : "Choose a suggestion, type your own, or Skip"}
                </span>
                <div className="flex items-center gap-2">
                  <Button type="button" onClick={() => handleDescription(true)} variant="ghost" className="text-muted-foreground">
                    Skip
                  </Button>
                  <Button type="button" onClick={() => handleDescription(false)} disabled={!hasDraftText}>
                    <Send className="h-3.5 w-3.5" aria-hidden="true" />
                    Send
                  </Button>
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
                <Button type="button" onClick={handleDates}>
                  <Send className="h-3.5 w-3.5" aria-hidden="true" />
                  Continue
                </Button>
              </div>
            </div>
          )}

          {step === "currency" && (
            <div className="space-y-2">
              <div className="relative">
                <NativeSelect
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
                </NativeSelect>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </div>
              <div className="flex justify-end">
                <Button type="button" onClick={handleCurrency}>
                  <Send className="h-3.5 w-3.5" aria-hidden="true" />
                  Continue
                </Button>
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


function Recap({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <span className="w-24 shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 font-medium text-foreground">{value}</span>
    </div>
  )
}
