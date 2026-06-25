// Unified category configuration for the Navisha design system.
// Phase 3A: Merges 3 separate families of category configs (TYPE_COLOR,
// CATEGORY_CONFIG, getActivityColor) into a single source of truth.
//
// Usage:
//   getCategoryColor("accommodation")   → "bg-stay-purple text-[#7C3AED]"
//   getCategoryLabel("accommodation")   → "Stay"
//   getCategoryIcon("accommodation")    → "hotel"

// ── Expense Categories ──

export const EXPENSE_CATEGORIES = [
  "accommodation",
  "transport",
  "food",
  "activity",
  "souvenir",
  "shopping",
  "other",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

interface CategoryStyle {
  bg: string;
  text: string;
  icon: string;
  label: string;
  /** Lighter bg variant for progress bars / dot indicators */
  bar: string;
}

const CATEGORY_MAP: Record<ExpenseCategory, CategoryStyle> = {
  accommodation: {
    bg: "bg-stay-purple",
    text: "text-[#7C3AED]",
    icon: "hotel",
    label: "Stay",
    bar: "bg-primary",
  },
  transport: {
    bg: "bg-transport-blue",
    text: "text-primary",
    icon: "directions_subway",
    label: "Transport",
    bar: "bg-[#DBEAFE]",
  },
  food: {
    bg: "bg-budget-green",
    text: "text-emerald-700",
    icon: "restaurant",
    label: "Food",
    bar: "bg-[#DCFCE7]",
  },
  activity: {
    bg: "bg-[#FFEDD5]",
    text: "text-orange-700",
    icon: "local_activity",
    label: "Activity",
    bar: "bg-[#FFEDD5]",
  },
  souvenir: {
    bg: "bg-[#FCE7F3]",
    text: "text-pink-600",
    icon: "redeem",
    label: "Gift",
    bar: "bg-[#FCE7F3]",
  },
  shopping: {
    bg: "bg-[#FEF9C3]",
    text: "text-yellow-700",
    icon: "shopping_cart",
    label: "Shopping",
    bar: "bg-[#FEF9C3]",
  },
  other: {
    bg: "bg-muted",
    text: "text-muted-foreground",
    icon: "receipt",
    label: "Other",
    bar: "bg-muted",
  },
} as const;

// ── Transport Types ──

export const TRANSPORT_TYPES = [
  "flight",
  "bus",
  "train",
  "ferry",
  "ship",
  "car",
  "other",
] as const;

export type TransportType = (typeof TRANSPORT_TYPES)[number];

const TRANSPORT_STYLE: Record<TransportType, { bg: string; text: string }> = {
  flight: { bg: "bg-[#DBEAFE]", text: "text-primary" },
  bus: { bg: "bg-muted", text: "text-muted-foreground" },
  train: { bg: "bg-secondary/10", text: "text-secondary" },
  ferry: { bg: "bg-[#EDE9FE]", text: "text-[#7C3AED]" },
  ship: { bg: "bg-[#EDE9FE]", text: "text-[#7C3AED]" },
  car: { bg: "bg-muted", text: "text-muted-foreground" },
  other: { bg: "bg-muted", text: "text-muted-foreground" },
};

// ── Accommodation Types ──

export const ACCOMMODATION_TYPES = ["hotel", "hostel", "apartment", "other"] as const;
export type AccommodationType = (typeof ACCOMMODATION_TYPES)[number];

const ACCOMMODATION_STYLE: Record<AccommodationType, { bg: string; text: string }> = {
  hotel: { bg: "bg-[#EDE9FE]", text: "text-[#7C3AED]" },
  hostel: { bg: "bg-[#DBEAFE]", text: "text-primary" },
  apartment: { bg: "bg-[#DCFCE7]", text: "text-emerald-700" },
  other: { bg: "bg-muted", text: "text-muted-foreground" },
};

// ── Activity Types ──

export const ACTIVITY_TYPES = ["location", "note", "todo"] as const;
export type ActivityTypeKey = (typeof ACTIVITY_TYPES)[number];

const ACTIVITY_STYLE: Record<ActivityTypeKey, { bg: string; text: string }> = {
  location: { bg: "bg-transport-blue", text: "text-primary" },
  note: { bg: "bg-note-yellow", text: "text-tertiary" },
  todo: {
    bg: "bg-surface-container-highest",
    text: "text-on-surface-variant",
  },
};

// ── Public Helpers ──

/** Get Tailwind classes for an expense category badge. */
export function getExpenseCategoryStyle(cat: string): { bg: string; text: string; icon: string; label: string; bar: string } {
  const c = CATEGORY_MAP[cat as ExpenseCategory];
  return c ?? CATEGORY_MAP.other;
}

/** Get Tailwind classes for a transport type badge. */
export function getTransportTypeStyle(t: string): { bg: string; text: string } {
  return TRANSPORT_STYLE[t as TransportType] ?? TRANSPORT_STYLE.other;
}

/** Get Tailwind classes for an accommodation type badge. */
export function getAccommodationTypeStyle(t: string): { bg: string; text: string } {
  return ACCOMMODATION_STYLE[t as AccommodationType] ?? ACCOMMODATION_STYLE.other;
}

/** Get Tailwind classes for an activity type badge. */
export function getActivityTypeStyle(t: string): { bg: string; text: string } {
  return ACTIVITY_STYLE[t as ActivityTypeKey] ?? ACTIVITY_STYLE.note;
}

/** Get the human-readable label for an expense category. */
export function getExpenseCategoryLabel(cat: string): string {
  return CATEGORY_MAP[cat as ExpenseCategory]?.label ?? cat;
}

/** Get the Material Symbols icon name for an expense category. */
export function getExpenseCategoryIcon(cat: string): string {
  return CATEGORY_MAP[cat as ExpenseCategory]?.icon ?? "receipt";
}

/** Check if a string is a valid expense category. */
export function isExpenseCategory(s: string): s is ExpenseCategory {
  return EXPENSE_CATEGORIES.includes(s as ExpenseCategory);
}
