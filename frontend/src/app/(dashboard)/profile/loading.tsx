import { Skeleton } from "@/components/ui/skeleton"

export default function ProfileLoading() {
  return (
    <div className="mx-auto max-w-lg px-4 pt-8 pb-24">
      <div className="mb-8 flex flex-col items-center text-center">
        <Skeleton variant="avatar" className="mb-4 h-24 w-24 rounded-full" />
        <Skeleton variant="text" className="h-6 w-36" />
        <Skeleton variant="text" className="mt-1 h-4 w-48" />
      </div>
      <Skeleton variant="glass" className="h-40 rounded-2xl" />
    </div>
  );
}
