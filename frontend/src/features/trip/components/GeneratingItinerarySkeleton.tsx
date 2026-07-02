"use client"

import { GeneratingIndicator } from "@/components/GeneratingIndicator"

const MESSAGES = [
  "Memahami preferensi perjalananmu...",
  "Mencari aktivitas terbaik...",
  "Menyusun itinerary harian...",
  "Menyeimbangkan waktu dan lokasi...",
  "Menambahkan tips perjalanan...",
  "Hampir selesai...",
]

interface Props {
  days?: number
}

export function GeneratingItinerarySkeleton({ days: _days }: Props) {
  return (
    <div className="flex h-full min-h-[260px] items-center justify-center" aria-live="polite" aria-busy="true">
      <GeneratingIndicator
        messages={MESSAGES}
        helperText="Ini bisa memakan waktu beberapa menit, santai sebentar ya."
      />
    </div>
  )
}
