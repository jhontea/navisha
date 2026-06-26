import { Skeleton, TripCardSkeleton } from "@/components/ui/skeleton"

/** Trips page loading — glass skeletons. */
export default function TripsLoading() {
  return (
    <div className="mx-auto max-w-max-width w-full px-margin-mobile md:px-margin-desktop pt-8 pb-24">
      <Skeleton variant="text" className="mb-6 w-24" />
      <Skeleton variant="text" className="mb-8 w-48 h-8" />
      <div className="mb-6 flex gap-2">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} variant="glass" className="h-8 w-16 rounded-full" />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <TripCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
