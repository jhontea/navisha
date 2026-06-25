/** Trips page loading skeleton — Loop 4: UX polish. */
export default function TripsLoading() {
  return (
    <div className="mx-auto max-w-max-width w-full px-margin-mobile md:px-margin-desktop pt-8 pb-24">
      <div className="mb-6 h-5 w-32 animate-pulse rounded bg-muted" />
      <div className="mb-8 h-8 w-48 animate-pulse rounded bg-muted" />
      <div className="mb-6 flex gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-8 w-16 animate-pulse rounded-full bg-muted" />
        ))}
      </div>
      <div className="flex flex-col gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-56 w-full animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    </div>
  );
}
