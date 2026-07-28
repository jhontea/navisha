import { Skeleton } from "@/components/ui/skeleton"

export default function ProfileLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-margin-mobile pb-28 pt-4 md:px-margin-desktop md:pb-8 md:pt-6">
      <div className="mb-5">
        <Skeleton variant="text" className="mb-2 h-3 w-28" />
        <Skeleton variant="text" className="h-8 w-40" />
        <Skeleton variant="text" className="mt-2 h-4 w-72 max-w-full" />
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Skeleton variant="glass" className="h-[420px] rounded-3xl" />
        <div className="space-y-6">
          <div>
            <Skeleton variant="text" className="mb-3 h-3 w-24" />
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[0, 1, 2, 3].map((item) => (
                <Skeleton key={item} variant="glass" className="h-36 rounded-2xl" />
              ))}
            </div>
          </div>
          <Skeleton variant="glass" className="h-36 rounded-2xl" />
        </div>
      </div>
    </div>
  )
}
