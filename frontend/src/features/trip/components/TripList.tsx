"use client"

import Link from "next/link"
import { Map } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTrips } from "../hooks/useTrips"
import { TripCard } from "./TripCard"

export function TripList() {
  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useTrips()

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading trips…</p>
  }
  if (isError) {
    return (
      <p className="text-sm text-destructive">
        Failed to load trips: {error?.message ?? "unknown error"}
      </p>
    )
  }

  const trips = data?.pages.flatMap((p) => p.items) ?? []

  if (trips.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed bg-muted/40 px-6 py-24 text-center">
        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-muted">
          <Map className="h-12 w-12 text-muted-foreground/60" />
        </div>
        <h2 className="mb-2 text-2xl font-semibold">No trips planned yet</h2>
        <p className="mb-8 max-w-sm text-muted-foreground">
          The world is waiting for you. Start planning your first adventure with
          Navisha today.
        </p>
        <Link href="/trips/new">
          <Button size="lg">Create my first trip</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {trips.map((t) => (
          <TripCard key={t.id} trip={t} />
        ))}
      </div>
      {hasNextPage && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? "Loading…" : "Load more"}
          </Button>
        </div>
      )}
    </div>
  )
}
