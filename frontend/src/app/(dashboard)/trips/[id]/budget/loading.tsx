/** Budget tab loading: content only (TripShell shows the hero and tabs). Same shape as BudgetScreen's loading state. */
export default function BudgetLoading() {
  return (
    <div className="mx-auto grid w-full max-w-max-width gap-6 px-margin-mobile py-6 md:px-margin-desktop lg:grid-cols-2" aria-hidden="true">
      <div className="h-64 animate-pulse rounded-xl bg-skeleton" />
      <div className="h-64 animate-pulse rounded-xl bg-skeleton" />
    </div>
  )
}
