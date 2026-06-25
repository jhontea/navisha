/** Trip budget loading skeleton — Loop 4. */
export default function BudgetLoading() {
  return (
    <div className="flex flex-col pb-4">
      <div className="h-40 w-full animate-pulse bg-muted sm:h-48" />
      <div className="flex gap-1 border-b border-border/60 px-2 pt-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-9 w-20 animate-pulse rounded-t-lg bg-muted" />
        ))}
      </div>
      <div className="mx-auto w-full max-w-lg space-y-3 px-4 py-4">
        <div className="h-16 animate-pulse rounded-xl bg-muted" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    </div>
  );
}
