import { Hotel, Bus, UtensilsCrossed, Ticket, Gift, ShoppingBag, Receipt } from "lucide-react"
import type { ComponentType } from "react"

/**
 * Canonical category color map — single source of truth.
 * Used by ExpenseSection, ExpenseForm, BudgetForm, BudgetSummary.
 *
 * Colors come from the --cat-* tokens (docs/DESIGN_SYSTEM.md). `text` tints
 * icons only; labels and values use text tokens (text-foreground /
 * text-muted-foreground), never the category color.
 */
export const CATEGORY_COLORS: Record<
  string,
  { bg: string; text: string; border: string; bar: string; emoji: string; Icon: ComponentType<{ className?: string }>; label: string }
> = {
  accommodation: { bg: "bg-cat-stay/10",      text: "text-cat-stay",      border: "border-l-cat-stay",      bar: "bg-cat-stay",      emoji: "🏨", Icon: Hotel,           label: "Stay"      },
  transport:     { bg: "bg-cat-transport/10", text: "text-cat-transport", border: "border-l-cat-transport", bar: "bg-cat-transport", emoji: "✈️", Icon: Bus,             label: "Transport" },
  food:          { bg: "bg-cat-food/10",      text: "text-cat-food",      border: "border-l-cat-food",      bar: "bg-cat-food",      emoji: "🍜", Icon: UtensilsCrossed, label: "Food"      },
  activity:      { bg: "bg-cat-activity/10",  text: "text-cat-activity",  border: "border-l-cat-activity",  bar: "bg-cat-activity",  emoji: "🎭", Icon: Ticket,          label: "Activity"  },
  souvenir:      { bg: "bg-cat-gift/10",      text: "text-cat-gift",      border: "border-l-cat-gift",      bar: "bg-cat-gift",      emoji: "🎁", Icon: Gift,            label: "Gift"      },
  shopping:      { bg: "bg-cat-shopping/10",  text: "text-cat-shopping",  border: "border-l-cat-shopping",  bar: "bg-cat-shopping",  emoji: "🛍️", Icon: ShoppingBag,    label: "Shopping"  },
  other:         { bg: "bg-cat-other/10",     text: "text-cat-other",     border: "border-l-cat-other",     bar: "bg-cat-other",     emoji: "📌", Icon: Receipt,         label: "Other"     },
}

/**
 * Fixed display order for charts and legends. The palette is validated for
 * color-vision deficiency in this order (adjacent pairs), so charts must not
 * re-sort segments by amount.
 */
export const CATEGORY_ORDER = [
  "accommodation",
  "transport",
  "food",
  "activity",
  "souvenir",
  "shopping",
  "other",
] as const

export function categoryRank(category: string): number {
  const i = (CATEGORY_ORDER as readonly string[]).indexOf(category.toLowerCase())
  return i === -1 ? CATEGORY_ORDER.length : i
}

export function getCategoryColor(category?: string) {
  if (!category) return CATEGORY_COLORS.other
  return CATEGORY_COLORS[category.toLowerCase()] ?? CATEGORY_COLORS.other
}
