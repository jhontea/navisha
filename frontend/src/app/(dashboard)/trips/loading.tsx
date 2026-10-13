/** Trips page loading: same shape as the page (title, next-up card, grid). */
export default function TripsLoading() {
  return (
    <div className="mx-auto w-full max-w-max-width px-margin-mobile pb-24 pt-6 md:px-margin-desktop" aria-hidden="true">
      <div className="mb-6 h-8 w-28 animate-pulse rounded-lg bg-muted" />
      <div className="mb-10 h-52 animate-pulse rounded-xl bg-muted" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-60 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    </div>
  )
}
