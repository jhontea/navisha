"use client"

import { useState } from "react"
import { Check, ClipboardPaste, Hotel, Loader2, ShieldCheck } from "lucide-react"

import { Notice } from "@/components/Notice"
import { QuotaBadge } from "@/components/QuotaBadge"
import { ResponsiveSheet } from "@/components/ResponsiveSheet"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { AddStaySheet } from "@/features/accommodation/components/AddStaySheet"
import { ACCOMMODATION_TYPE_LABELS } from "@/features/accommodation/types"
import { AddTransportationSheet } from "@/features/transportation/components/AddTransportationSheet"
import { TransportIcon } from "@/features/transportation/components/TransportIcon"
import { transportTypeLabel } from "@/features/transportation/lib/transportType"
import { ApiError, isOfflineError } from "@/lib/api"
import { formatClock, formatShortRange, formatWeekdayDate } from "@/lib/calendar"
import { formatMoney } from "@/lib/money"
import { cn } from "@/lib/utils"

import { useParseBookings } from "../hooks/useParseBookings"
import { stayDraft, transportDraft } from "../lib/drafts"
import type { ParsedBooking } from "../types"

/** Same limit as the backend, counted the same way (characters, not UTF-16 units). */
const MAX_CHARS = 8000

interface Props {
  tripId: string
  tripBaseCurrency: string
  days: { date: string }[]
  destination?: string
  /** Bump to open the sheet from elsewhere (the floating add button on phones). */
  openRequest?: number
}

/**
 * "Paste confirmation": the AI reads bookings from pasted text, and each one
 * opens the usual add form prefilled. Nothing is saved until the user saves a form.
 */
export function PasteConfirmation({ tripId, tripBaseCurrency, days, destination, openRequest }: Props) {
  const parse = useParseBookings(tripId)
  // "paste" = the sheet (text or preview); a number = the add form for that booking.
  const [view, setView] = useState<"paste" | number | null>(null)
  const [text, setText] = useState("")
  const [added, setAdded] = useState<ReadonlySet<number>>(new Set())
  // A new request from the floating button opens the sheet (state adjusted during render).
  const [seenRequest, setSeenRequest] = useState(openRequest)
  if (openRequest !== seenRequest) {
    setSeenRequest(openRequest)
    if (openRequest) setView("paste")
  }

  // The backend trims before counting.
  const chars = [...text.trim()].length
  const tooLong = chars > MAX_CHARS
  const bookings = parse.data?.bookings ?? []
  const status = parse.error instanceof ApiError ? parse.error.status : undefined
  const adding = typeof view === "number" ? bookings[view] : undefined

  // Closing drops the text and the results; nothing is kept.
  const close = () => {
    setView(null)
    setText("")
    setAdded(new Set())
    parse.reset()
  }
  const markAdded = () => {
    if (typeof view === "number") setAdded((prev) => new Set(prev).add(view))
  }
  // Only for the form that closed: a save that resolves late must not reopen a closed sheet or close another form.
  const backToPreview = (open: boolean) => {
    const closing = view
    if (!open) setView((v) => (v === closing ? "paste" : v))
  }

  return (
    <>
      <Button variant="outline" onClick={() => setView("paste")}>
        <ClipboardPaste aria-hidden="true" />
        Paste confirmation
      </Button>

      <ResponsiveSheet
        open={view === "paste"}
        onOpenChange={(open) => !open && close()}
        title="Paste confirmation"
        description={bookings.length ? undefined : "Paste a flight, train, bus or hotel confirmation. You check each booking before it's saved."}
      >
        {bookings.length > 0 ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground" role="status">
              Found {bookings.length} {bookings.length === 1 ? "booking" : "bookings"}. Check each one before you save it.
            </p>
            <ul className="space-y-3">
              {bookings.map((booking, i) => (
                <BookingRow key={i} booking={booking} added={added.has(i)} onAdd={() => setView(i)} />
              ))}
            </ul>
            <div className="flex items-center justify-between gap-3">
              <Button
                variant="ghost"
                onClick={() => {
                  parse.reset()
                  setText("")
                  setAdded(new Set())
                }}
              >
                Paste another
              </Button>
              {added.size === bookings.length && <Button onClick={close}>Done</Button>}
            </div>
          </div>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              if (text.trim() && !tooLong) parse.mutate(text)
            }}
          >
            {status === 429 && (
              <Notice tone="warning" title="Daily AI limit reached">
                You&apos;ve used today&apos;s AI uses. The limit resets at the time shown below.
              </Notice>
            )}
            {parse.isError && status !== 429 && !isOfflineError(parse.error) && (
              <Notice tone="error" title="Couldn't read this text">
                {status === 400 ? parse.error.message : "Try again in a moment."}
              </Notice>
            )}
            {parse.isSuccess && (
              <Notice tone="warning" title="No bookings found in this text">
                Paste the whole confirmation, including dates and places.
              </Notice>
            )}

            <div className="space-y-2">
              <Label htmlFor="paste-confirmation-text">Confirmation text</Label>
              <Textarea
                id="paste-confirmation-text"
                value={text}
                onChange={(e) => {
                  setText(e.target.value)
                  // A notice about the previous text no longer applies.
                  if (!parse.isIdle) parse.reset()
                }}
                rows={8}
                className="max-h-72"
                placeholder="Paste the text of your booking email or e-ticket."
                disabled={parse.isPending}
                aria-invalid={tooLong || undefined}
                aria-describedby="paste-confirmation-count paste-confirmation-privacy"
              />
              <p
                id="paste-confirmation-count"
                className={cn("text-right text-xs tabular-nums", tooLong ? "font-medium text-destructive" : "text-muted-foreground")}
              >
                {tooLong && "Too long. Keep it under 8,000 characters. "}
                {chars.toLocaleString("en-US")} / {MAX_CHARS.toLocaleString("en-US")}
              </p>
            </div>

            <p id="paste-confirmation-privacy" className="flex items-start gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              Your text is sent to our AI provider to read it. We don&apos;t store it.
            </p>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <QuotaBadge />
              <Button type="submit" disabled={!text.trim() || tooLong || parse.isPending}>
                {parse.isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
                {parse.isPending ? "Reading…" : "Read bookings"}
              </Button>
            </div>
          </form>
        )}
      </ResponsiveSheet>

      <AddTransportationSheet
        tripId={tripId}
        tripBaseCurrency={tripBaseCurrency}
        open={adding?.kind === "transport"}
        onOpenChange={backToPreview}
        draft={adding?.kind === "transport" ? transportDraft(adding.transport) : undefined}
        draftCost={adding?.cost}
        onCreated={markAdded}
      />
      <AddStaySheet
        tripId={tripId}
        tripBaseCurrency={tripBaseCurrency}
        open={adding?.kind === "stay"}
        onOpenChange={backToPreview}
        draft={adding?.kind === "stay" ? stayDraft(adding.stay) : undefined}
        draftCost={adding?.cost}
        onCreated={markAdded}
        days={days}
        destination={destination}
      />
    </>
  )
}

function BookingRow({ booking, added, onAdd }: { booking: ParsedBooking; added: boolean; onAdd: () => void }) {
  let title: string
  let place: string
  let when: string | null
  if (booking.kind === "transport") {
    const t = booking.transport
    title = [transportTypeLabel(t.type), t.label || t.operator].filter(Boolean).join(" · ")
    place = [t.from_location, t.to_location].filter(Boolean).join(" → ")
    when = [formatWeekdayDate(t.departure_datetime), formatClock(t.departure_datetime)].filter(Boolean).join(" · ")
  } else {
    const s = booking.stay
    title = [s.accommodation_type ? ACCOMMODATION_TYPE_LABELS[s.accommodation_type] : "Stay", s.name].filter(Boolean).join(" · ")
    place = s.location_name
    when = formatShortRange(s.check_in, s.check_out)
  }
  const cost = booking.cost ? formatMoney(booking.cost.amount, booking.cost.currency) : null

  return (
    <li className="flex items-start gap-3 rounded-2xl border bg-card p-3">
      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary-soft-foreground">
        {booking.kind === "transport" ? (
          <TransportIcon type={booking.transport.type} className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Hotel className="h-4 w-4" aria-hidden="true" />
        )}
      </span>
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-bold break-words text-foreground">{title}</p>
        {place && <p className="break-words text-muted-foreground">{place}</p>}
        <p className="text-muted-foreground">
          {[when || "No date", cost].filter(Boolean).join(" · ")}
        </p>
      </div>
      {added ? (
        <span className="flex h-9 shrink-0 items-center gap-1.5 px-1 text-sm font-medium text-success">
          <Check className="h-4 w-4" aria-hidden="true" />
          Added
        </span>
      ) : (
        <Button size="sm" variant="soft" onClick={onAdd} aria-label={`Add ${title}`}>
          Add
        </Button>
      )}
    </li>
  )
}
