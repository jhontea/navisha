import { Skeleton } from "@/components/ui/skeleton"

/** Trip detail loading — glass skeletons. */
export default function TripDetailLoading() {
  return (
    <div className="flex flex-col pb-4">
      {/* Hero skeleton */}
      <Skeleton className="h-40 w-full sm:h-48 rounded-none" />
      {/* Section nav skeleton */}
      <div className="flex gap-1 px-2 pt-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} variant="glass" className="h-9 w-20 rounded-xl" />
        ))}
      </div>
      {/* Content skeleton */}
      <div className="mx-auto w-full max-w-lg space-y-3 px-4 py-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} variant="glass" className="h-24" />
        ))}
      </div>
    </div>
  );
}
