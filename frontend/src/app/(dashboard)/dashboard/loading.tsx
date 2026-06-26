import { Skeleton, TripCardSkeleton } from "@/components/ui/skeleton"

/** Dashboard loading — glass skeletons. */
export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-max-width w-full px-margin-mobile md:px-margin-desktop pt-8 pb-24">
      <div className="mb-10 space-y-2">
        <Skeleton variant="text" className="w-40" />
        <Skeleton variant="text" className="w-64 h-8" />
      </div>
      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <Skeleton variant="glass" className="h-20" />
        <Skeleton variant="glass" className="h-20" />
      </div>
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <TripCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
