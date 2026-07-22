"use client"

import { useEffect, useMemo, useState } from "react"
import { Check, Copy, Link2, Loader2, ShieldCheck, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { tripApi } from "../api"
import type { ShareDurationDays, TripShareLink } from "../types"
import { ApiError } from "@/lib/api"

const durations: Array<{ value: ShareDurationDays; label: string }> = [
  { value: 1, label: "24 hours" }, { value: 3, label: "3 days" },
  { value: 7, label: "7 days" }, { value: 14, label: "14 days" },
  { value: 30, label: "30 days" },
]

interface Props { tripId: string; open: boolean; onOpenChange: (open: boolean) => void }

export function TripShareDialog({ tripId, open, onOpenChange }: Props) {
  const [duration, setDuration] = useState<ShareDurationDays>(7)
  const [link, setLink] = useState<TripShareLink | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!open) return
    setError(""); setLoading(true)
    tripApi.getActiveShareLink(tripId)
      .then(setLink)
      .catch((err) => { if (!(err instanceof ApiError && err.status === 404)) setError("Could not check the current share link.") })
      .finally(() => setLoading(false))
  }, [open, tripId])

  const url = useMemo(() => link && typeof window !== "undefined" ? `${window.location.origin}/share/${link.token}` : "", [link])

  const generate = async () => {
    setLoading(true); setError(""); setCopied(false)
    try { setLink(await tripApi.createShareLink(tripId, duration)) }
    catch { setError("Could not create the share link. Please try again.") }
    finally { setLoading(false) }
  }

  const copy = async () => {
    if (!url) return
    await navigator.clipboard.writeText(url)
    setCopied(true); window.setTimeout(() => setCopied(false), 1800)
  }

  const revoke = async () => {
    setLoading(true); setError("")
    try { await tripApi.revokeShareLink(tripId); setLink(null) }
    catch { setError("Could not disable the share link.") }
    finally { setLoading(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Link2 className="h-4 w-4 text-primary" /> Share itinerary</DialogTitle>
          <DialogDescription>Anyone with the link can view a read-only itinerary until it expires.</DialogDescription>
        </DialogHeader>

        {loading && !link ? <div className="flex items-center justify-center py-8 text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Checking link…</div> : link ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium"><ShieldCheck className="h-4 w-4 text-primary" /> Active read-only link</div>
              <div className="flex gap-2"><input readOnly value={url} aria-label="Share link" className="min-w-0 flex-1 rounded-lg border bg-background px-3 text-xs" /><Button onClick={copy} className="rounded-full">{copied ? <Check /> : <Copy />}{copied ? "Copied" : "Copy"}</Button></div>
              <p className="mt-2 text-xs text-muted-foreground">Expires {new Date(link.expires_at).toLocaleString()}</p>
            </div>
            <p className="text-xs text-muted-foreground">Creating another link will immediately disable this one.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-medium">Link duration</p>
            <div className="grid grid-cols-3 gap-2">
              {durations.map((item) => <button key={item.value} type="button" aria-pressed={duration === item.value} onClick={() => setDuration(item.value)} className={`rounded-full border px-3 py-2 text-xs font-medium transition ${duration === item.value ? "border-primary bg-primary text-primary-foreground" : "hover:border-primary/50"}`}>{item.label}</button>)}
            </div>
            <div className="rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">Private notes, budget, expenses, booking references, and profile details are never included.</div>
          </div>
        )}
        {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
        <DialogFooter className="flex-row justify-end">
          {link ? <><Button variant="destructive" onClick={revoke} disabled={loading} className="rounded-full"><Trash2 /> Disable link</Button><Button variant="outline" onClick={generate} disabled={loading} className="rounded-full">Create new link</Button></> : <Button variant="gradient" onClick={generate} disabled={loading} className="rounded-full px-5 shadow-md shadow-primary/25">{loading && <Loader2 className="animate-spin" />} Create share link</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
