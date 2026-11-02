import { Skeleton } from "@/components/ui/skeleton"

/** Trip tab loading: content only, since TripShell (the layout) already shows the hero and tabs. Same shape as ItineraryScreen's loading state. */
export default function TripDetailLoading() {
  return (
    <div className="mx-auto flex w-full max-w-max-width flex-col gap-3 px-margin-mobile py-6 md:px-margin-desktop" aria-hidden="true">
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} variant="circle" className="size-12" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  )
}
