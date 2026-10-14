export type OverviewTodo = { label: string; href: string }

export type OverviewTodoInput = {
  tripId: string
  activityCount: number
  stayCount: number
  transportCount: number
  budget: number
  spent: number
  /** Days with no activities; null while activity counts are unknown. */
  emptyDayCount: number | null
  overCategoryCount: number
}

/**
 * What is still missing or off-plan for a trip, in the order a traveller
 * would fix it. Empty when the trip is ready.
 */
export function overviewTodos(input: OverviewTodoInput): OverviewTodo[] {
  const { tripId: id, emptyDayCount, overCategoryCount } = input
  const todos: Array<OverviewTodo | false> = [
    input.activityCount === 0 && { label: "Add activities to your itinerary", href: `/trips/${id}` },
    input.activityCount > 0 &&
      emptyDayCount !== null &&
      emptyDayCount > 0 && {
        label: `${emptyDayCount} ${emptyDayCount === 1 ? "day has" : "days have"} no activities`,
        href: `/trips/${id}`,
      },
    input.stayCount === 0 && { label: "Add where you're staying", href: `/trips/${id}/bookings` },
    input.transportCount === 0 && { label: "Add your transport", href: `/trips/${id}/bookings` },
    input.budget <= 0 && { label: "Set a trip budget", href: `/trips/${id}/budget` },
    input.budget > 0 && input.spent > input.budget && { label: "Spending is over budget", href: `/trips/${id}/budget` },
    overCategoryCount > 0 && {
      label: `${overCategoryCount} budget ${overCategoryCount === 1 ? "category is" : "categories are"} over plan`,
      href: `/trips/${id}/budget`,
    },
  ]
  return todos.filter((todo): todo is OverviewTodo => Boolean(todo))
}
