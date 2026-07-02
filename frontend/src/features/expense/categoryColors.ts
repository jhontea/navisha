import { Hotel, Bus, UtensilsCrossed, Ticket, Gift, ShoppingBag, Receipt } from "lucide-react"
import type { ElementType } from "react"

/**
 * Canonical category color map — single source of truth.
 * Used by ExpenseCard, ExpenseSection, BudgetSummary.
 */
export const CATEGORY_COLORS: Record<
  string,
  { bg: string; text: string; border: string; bar: string; emoji: string; Icon: ElementType; label: string }
> = {
  accommodation: { bg: "bg-primary/10",          text: "text-primary",           border: "border-l-primary",           bar: "bg-primary",           emoji: "🏨", Icon: Hotel,           label: "Stay"      },
  transport:     { bg: "bg-chromatic-ocean/10",   text: "text-chromatic-ocean",   border: "border-l-chromatic-ocean",   bar: "bg-chromatic-ocean",   emoji: "✈️", Icon: Bus,             label: "Transport" },
  food:          { bg: "bg-chromatic-amber/10",   text: "text-chromatic-amber",   border: "border-l-chromatic-amber",   bar: "bg-chromatic-amber",   emoji: "🍜", Icon: UtensilsCrossed, label: "Food"      },
  activity:      { bg: "bg-chromatic-aurora/10",  text: "text-chromatic-aurora",  border: "border-l-chromatic-aurora",  bar: "bg-chromatic-aurora",  emoji: "🎭", Icon: Ticket,          label: "Activity"  },
  souvenir:      { bg: "bg-chromatic-mint/10",    text: "text-chromatic-mint",    border: "border-l-chromatic-mint",    bar: "bg-chromatic-mint",    emoji: "🎁", Icon: Gift,            label: "Gift"      },
  shopping:      { bg: "bg-chromatic-sky/10",     text: "text-chromatic-sky",     border: "border-l-chromatic-sky",     bar: "bg-chromatic-sky",     emoji: "🛍️", Icon: ShoppingBag,    label: "Shopping"  },
  other:         { bg: "bg-muted",                text: "text-muted-foreground",  border: "border-l-border",            bar: "bg-muted-foreground",  emoji: "📌", Icon: Receipt,         label: "Other"     },
}

export function getCategoryColor(category?: string) {
  if (!category) return CATEGORY_COLORS.other
  return CATEGORY_COLORS[category.toLowerCase()] ?? CATEGORY_COLORS.other
}
