"use client"

import { useTrips } from "../hooks/useTrips"
import { tripStatus } from "../lib/status"

function MaterialIcon({ name, size = 24, className = "" }: { name: string; size?: number; className?: string }) {
  return (
    <span
      className={`material-symbols-outlined ${className}`}
      style={{ fontSize: size }}
      aria-hidden="true"
    >
      {name}
    </span>
  )
}

export function StatsSection() {
  const { data } = useTrips()
  const trips = data?.pages.flatMap((p) => p.items) ?? []

  const completed = trips.filter(
    (t) => tripStatus(t.start_date, t.end_date) === "past",
  ).length
  const upcoming = trips.filter(
    (t) => tripStatus(t.start_date, t.end_date) === "upcoming",
  ).length
  const currencies = new Set(trips.map((t) => t.base_currency)).size

  const milesToNext = 250
  const progressPct = 75
  const level = completed > 5 ? "Gold" : "Silver"

  return (
    <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
      {/* Trips Completed */}
      <div className="p-6 rounded-2xl flex flex-col justify-between h-40" style={{ backgroundColor: '#d8e2ff' }}>
        <MaterialIcon name="flight_takeoff" size={32} className="text-primary" />
        <div>
          <p className="text-headline-md font-headline-md text-on-primary-fixed">
            {completed}
          </p>
          <p className="text-label-md font-label-md text-on-primary-fixed-variant">
            Trips Completed
          </p>
        </div>
      </div>

      {/* Countries Visited */}
      <div className="p-6 rounded-2xl flex flex-col justify-between h-40" style={{ backgroundColor: '#EDE9FE' }}>
        <MaterialIcon name="public" size={32} className="text-on-secondary-fixed" />
        <div>
          <p className="text-headline-md font-headline-md text-on-secondary-fixed">
            {currencies}
          </p>
          <p className="text-label-md font-label-md text-on-secondary-fixed-variant">
            Countries Visited
          </p>
        </div>
      </div>

      {/* Traveler Level */}
      <div className="p-6 bg-surface-container rounded-2xl flex items-center gap-8 h-40" style={{ gridColumn: 'span 2', minWidth: 0 }}>
        <div className="flex-1">
          <p className="text-headline-sm font-headline-sm text-on-surface mb-1">
            Traveler Level: {level}
          </p>
          <p className="text-body-sm font-body-sm text-on-surface-variant">
            {upcoming > 0 ? `${upcoming} upcoming · ` : ""}{milesToNext} miles until Platinum status
          </p>
          <div className="w-full h-2 bg-surface-container-high rounded-full mt-4 overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-1000 rounded-full"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
        <div
          className="shrink-0"
          style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            backgroundColor: 'rgba(0, 88, 188, 0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: 40, color: '#0058bc' }}
          >
            military_tech
          </span>
        </div>
      </div>
    </section>
  )
}
