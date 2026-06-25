"use client"

import type { TripDraft } from "../types"

interface Props {
  draft: TripDraft
}

// DraftPreview renders a generated itinerary read-only. The user reviews this
// before committing the trip. Kept presentational; no data fetching here.
export function DraftPreview({ draft }: Props) {
  const totalActivities = draft.days.reduce((n, d) => n + d.activities.length, 0)

  return (
    <div className="space-y-6">
      {/* Header summary */}
      <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6">
        <h3 className="font-headline-md text-headline-md text-on-surface mb-1">
          {draft.title}
        </h3>
        {draft.summary && (
          <p className="font-body-md text-on-surface-variant mb-4">{draft.summary}</p>
        )}
        <div className="flex flex-wrap gap-4 text-body-sm text-on-surface-variant">
          <span className="inline-flex items-center gap-1.5">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>calendar_month</span>
            {draft.days.length} hari
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>list</span>
            {totalActivities} aktivitas
          </span>
          {draft.budget > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>payments</span>
              {draft.budget.toLocaleString()} {draft.base_currency}
            </span>
          )}
        </div>
      </div>

      {/* Days */}
      <div className="space-y-4">
        {draft.days.map((day) => (
          <div
            key={day.day_number}
            className="rounded-xl border border-outline-variant bg-white p-5"
          >
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-on-primary font-label-sm text-label-sm">
                {day.day_number}
              </span>
              <span className="font-label-md text-label-md text-on-surface">
                Hari {day.day_number}
              </span>
              <span className="text-body-sm text-on-surface-variant">{day.date}</span>
            </div>

            {day.activities.length === 0 ? (
              <p className="pl-10 text-body-sm text-on-surface-variant italic">
                Belum ada aktivitas
              </p>
            ) : (
              <ul className="space-y-2 pl-10">
                {day.activities.map((a, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span
                      className="material-symbols-outlined mt-0.5 text-outline"
                      style={{ fontSize: 18 }}
                    >
                      {a.type === "location" ? "location_on" : "sticky_note_2"}
                    </span>
                    <div className="min-w-0">
                      <p className="font-body-md text-on-surface">
                        {a.title}
                        {(a.start_time || a.end_time) && (
                          <span className="ml-2 text-body-sm text-on-surface-variant">
                            {a.start_time}
                            {a.end_time ? `–${a.end_time}` : ""}
                          </span>
                        )}
                      </p>
                      {a.type === "location" && a.location_name && (
                        <p className="text-body-sm text-on-surface-variant">{a.location_name}</p>
                      )}
                      {a.notes && (
                        <p className="text-body-sm text-on-surface-variant">{a.notes}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
