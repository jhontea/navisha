import type { Announcements, ScreenReaderInstructions, UniqueIdentifier } from "@dnd-kit/core"

type Ordered = { id: string; start_time?: string | null; order_index?: number }

/**
 * Sort a day's activities by start time. Untimed activities (notes, to-dos)
 * keep their slots; the timed ones are sorted among the remaining slots, so
 * "Pack bags" listed between breakfast and lunch stays in that slot.
 * Ties keep their current order.
 */
export function sortByStartTime<A extends Ordered>(activities: A[]): A[] {
  const timed = activities
    .map((activity, index) => ({ activity, index }))
    .filter(({ activity }) => Boolean(activity.start_time))
    .sort((a, b) => a.activity.start_time!.slice(0, 5).localeCompare(b.activity.start_time!.slice(0, 5)) || a.index - b.index)
    .map(({ activity }) => activity)
  let next = 0
  return activities.map((activity) => (activity.start_time ? timed[next++] : activity))
}

/** Whether sortByStartTime would change the order. */
export function isSortedByStartTime(activities: Ordered[]): boolean {
  return sortByStartTime(activities).every((activity, index) => activity.id === activities[index].id)
}

/** Put a newly created activity at the position the server gave it. */
export function insertAtOrderIndex<A extends Ordered>(activities: A[], created: A): A[] {
  const without = activities.filter((activity) => activity.id !== created.id)
  const index = Math.min(Math.max(created.order_index ?? without.length, 0), without.length)
  return [...without.slice(0, index), created, ...without.slice(index)]
}

/**
 * Screen reader copy for reordering a day's activities: names the activity
 * and its position instead of dnd-kit's default "Draggable item <uuid>".
 */
export function reorderAnnouncements(activities: { id: string; title: string }[]): Announcements {
  const title = (id: UniqueIdentifier) => activities.find((a) => a.id === id)?.title ?? "Activity"
  const position = (id: UniqueIdentifier) => `position ${activities.findIndex((a) => a.id === id) + 1} of ${activities.length}`
  return {
    onDragStart: ({ active }) => `Picked up ${title(active.id)}, ${position(active.id)}.`,
    onDragOver: ({ active, over }) =>
      over ? `${title(active.id)} moved to ${position(over.id)}.` : `${title(active.id)} is no longer over the list.`,
    onDragEnd: ({ active, over }) =>
      over ? `${title(active.id)} dropped at ${position(over.id)}.` : `${title(active.id)} dropped.`,
    onDragCancel: ({ active }) => `Reordering cancelled. ${title(active.id)} is back at ${position(active.id)}.`,
  }
}

export const reorderInstructions: ScreenReaderInstructions = {
  draggable:
    "To reorder, press Space or Enter to pick up the activity. Use the up and down arrow keys to move it, Space or Enter to drop it, or Escape to cancel.",
}
