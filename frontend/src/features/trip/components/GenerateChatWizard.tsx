"use client"

import { useEffect, useRef, useState } from "react"
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

const inputBase =
  "w-full px-4 py-3 rounded-lg border border-outline-variant bg-surface-container-lowest font-body-md text-body-md text-on-surface transition-all focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary placeholder:text-on-surface-variant/50"

// GenerateChatWizard collects the auto-generate inputs through a guided,
// chat-style flow. Each answer becomes a bubble; the final step shows a recap
// plus the Generate button. State is held locally and emitted via onSubmit.
export function GenerateChatWizard({ onSubmit, disabled }: Props) {
  const { data: currencyData } = useSupportedCurrencies()
  const currencies = currencyData?.supported ?? []

  const [step, setStep] = useState<StepId>("destination")
  const [messages, setMessages] = useState<ChatMessage[]>([
    { from: "bot", text: "Halo! Aku bantu susun itinerary-mu. Mau liburan ke mana?" },
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
      setError("Isi dulu tujuannya ya.")
      return
    }
    setError(null)
    setDestination(v)
    pushUser(v)
    setDraftText("")
    setStep("description")
    pushBot("Mantap! Coba ceritakan tujuan atau preferensimu (opsional). Misalnya: suka anime, kuliner, atau budget hemat.")
  }

  const handleDescription = (skip: boolean) => {
    const v = skip ? "" : draftText.trim()
    setError(null)
    setDescription(v)
    pushUser(skip || !v ? "(lewati)" : v)
    setDraftText("")
    setStep("dates")
    pushBot("Oke! Dari kapan sampai kapan rencananya? (maksimal 10 hari)")
  }

  const handleDates = () => {
    if (!startDate || !endDate) {
      setError("Pilih tanggal mulai dan selesai.")
      return
    }
    if (span === 0) {
      setError("Tanggal selesai tidak boleh sebelum tanggal mulai.")
      return
    }
    if (span > MAX_DAYS) {
      setError(`Maksimal ${MAX_DAYS} hari (sekarang ${span} hari).`)
      return
    }
    setError(null)
    pushUser(`${startDate} → ${endDate} (${span} hari)`)
    setStep("currency")
    pushBot("Terakhir, mata uang apa yang mau dipakai untuk perkiraan budget?")
  }

  const handleCurrency = () => {
    setError(null)
    pushUser(currency)
    setStep("review")
    pushBot("Siap! Ini ringkasannya. Kalau sudah pas, klik Generate Itinerary.")
  }

  const handleGenerate = () => {
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
    setMessages([{ from: "bot", text: "Halo! Aku bantu susun itinerary-mu. Mau liburan ke mana?" }])
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

  return (
    <div className="rounded-xl border border-surface-container-high bg-white shadow-sm overflow-hidden">
      {/* Chat transcript */}
      <div ref={scrollRef} className="max-h-[380px] overflow-y-auto p-6 space-y-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}
            style={{ animation: "fadeSlide 0.3s ease-out" }}
          >
            {m.from === "bot" && (
              <span
                className="material-symbols-outlined text-primary mr-2 mt-1 shrink-0"
                style={{ fontSize: 22 }}
              >
                auto_awesome
              </span>
            )}
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 font-body-md text-body-md ${
                m.from === "user"
                  ? "bg-primary text-on-primary rounded-br-sm"
                  : "bg-surface-container text-on-surface rounded-bl-sm"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
      </div>

      {/* Input area — changes per step */}
      {step !== "review" && (
        <div className="border-t border-surface-container-high p-4 space-y-3">
          {error && <p className="text-body-sm text-error">{error}</p>}

          {step === "destination" && (
            <div className="space-y-2">
              <input
                autoFocus
                className={inputBase}
                placeholder="mis. Tokyo, Jepang"
                maxLength={MAX_DESTINATION}
                value={draftText}
                onChange={(e) => setDraftText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleDestination()}
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-on-surface-variant">{draftText.length}/{MAX_DESTINATION}</span>
                <button type="button" onClick={handleDestination} className={sendBtn}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>send</span>
                  Kirim
                </button>
              </div>
            </div>
          )}

          {step === "description" && (
            <div className="space-y-2">
              <input
                autoFocus
                className={inputBase}
                placeholder="mis. suka anime, kuliner, budget hemat"
                maxLength={MAX_DESCRIPTION}
                value={draftText}
                onChange={(e) => setDraftText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleDescription(false)}
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-on-surface-variant">{draftText.length}/{MAX_DESCRIPTION}</span>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => handleDescription(true)} className={ghostBtn}>
                    Lewati
                  </button>
                  <button type="button" onClick={() => handleDescription(false)} className={sendBtn}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>send</span>
                    Kirim
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === "dates" && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs text-on-surface-variant">Rentang Tanggal</label>
                <div className="flex rounded-lg border border-outline-variant focus-within:border-primary focus-within:ring-1 focus-within:ring-primary overflow-hidden bg-surface-container-lowest">
                  <input
                    type="date"
                    className="flex-1 min-w-0 px-3 py-3 font-body-md text-body-md text-on-surface bg-transparent border-none outline-none rounded-none [color-scheme:light]"
                    value={startDate}
                    onClick={openPicker}
                    onChange={(e) => {
                      setStartDate(e.target.value)
                      setTimeout(() => endDateRef.current?.showPicker?.(), 100)
                    }}
                  />
                  <span className="flex items-center text-on-surface-variant/30 text-sm px-0.5 select-none">—</span>
                  <input
                    ref={endDateRef}
                    type="date"
                    className="flex-1 min-w-0 px-3 py-3 font-body-md text-body-md text-on-surface bg-transparent border-none outline-none rounded-none [color-scheme:light]"
                    value={endDate}
                    min={startDate || undefined}
                    onClick={openPicker}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-on-surface-variant">
                  {span > 0 ? `${span} hari` : "Pilih rentang tanggal"}
                </span>
                <button type="button" onClick={handleDates} className={sendBtn}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>send</span>
                  Lanjut
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
                <span
                  className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-outline"
                  style={{ fontSize: 20 }}
                >
                  expand_more
                </span>
              </div>
              <div className="flex justify-end">
                <button type="button" onClick={handleCurrency} className={sendBtn}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>send</span>
                  Lanjut
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Review / generate */}
      {step === "review" && (
        <div className="border-t border-surface-container-high p-5 space-y-4">
          <div className="rounded-lg bg-surface-container-low p-4 space-y-1.5 text-body-sm">
            <Recap label="Tujuan" value={destination} />
            {description && <Recap label="Preferensi" value={description} />}
            <Recap label="Tanggal" value={`${startDate} → ${endDate} (${span} hari)`} />
            <Recap label="Mata uang" value={currency} />
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={disabled}
              className="flex-1 sm:flex-none px-8 py-3 bg-primary text-on-primary font-label-md text-label-md rounded-lg hover:opacity-90 transition-all active:scale-95 shadow-md shadow-primary/20 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>auto_fix_high</span>
              Generate Itinerary
            </button>
            <button
              type="button"
              onClick={restart}
              disabled={disabled}
              className="px-6 py-3 text-on-surface-variant font-label-md text-label-md hover:text-primary transition-colors disabled:opacity-60"
            >
              Ulangi dari awal
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const sendBtn =
  "inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-on-primary font-label-md text-label-md rounded-lg hover:opacity-90 transition-all active:scale-95"
const ghostBtn =
  "px-4 py-2 text-on-surface-variant font-label-md text-label-md rounded-lg hover:bg-surface-container transition-colors"

function Recap({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-on-surface-variant min-w-[90px]">{label}</span>
      <span className="text-on-surface font-medium">{value}</span>
    </div>
  )
}
