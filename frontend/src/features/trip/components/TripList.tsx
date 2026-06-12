"use client"

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
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-sm text-muted-foreground">No trips yet.</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Create your first trip to get started.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
