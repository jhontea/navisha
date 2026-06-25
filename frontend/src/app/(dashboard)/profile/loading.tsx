/** Profile page loading skeleton — Loop 4: UX polish. */
export default function ProfileLoading() {
  return (
    <div className="mx-auto max-w-lg px-4 pt-8 pb-24">
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="mb-4 h-24 w-24 animate-pulse rounded-full bg-muted" />
        <div className="h-6 w-36 animate-pulse rounded bg-muted" />
        <div className="mt-1 h-4 w-48 animate-pulse rounded bg-muted" />
      </div>
      <div className="h-40 animate-pulse rounded-2xl bg-muted" />
    </div>
  );
}
