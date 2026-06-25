/** Dashboard loading skeleton — Loop 4: UX polish. */
export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-max-width w-full px-margin-mobile md:px-margin-desktop pt-8 pb-24">
      <div className="mb-12 h-12 w-64 animate-pulse rounded bg-muted" />
      <div className="flex flex-col gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-56 w-full animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    </div>
  );
}
