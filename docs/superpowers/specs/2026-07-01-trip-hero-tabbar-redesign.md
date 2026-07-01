# Trip Hero & Tab Bar Redesign

**Date:** 2026-07-01
**Status:** Approved

## Problem

Two UI issues on laptop/desktop view:

1. **TripHero too tall**: `min-h-[280px]` wastes vertical space. The edit/delete buttons (top-right) and title/content (bottom-left) are diagonally opposite — large visual gap.
2. **TripTabBar needs polish**: Current underline style works but pill/segmented tabs are more modern and consistent with current UI trends.
3. **Hero too wide on laptop**: Full-bleed hero stretches edge-to-edge on wide screens, disconnected from the contained content below.

## Scope

Two components: `TripHero.tsx` and `TripTabBar.tsx`. Both in `frontend/src/features/trip/components/`.

---

## 1. TripHero Redesign

### Changes

| Property | Before | After |
|----------|--------|-------|
| Width (mobile) | `w-full` | `w-full` (unchanged) |
| Width (desktop) | `w-full` | `md:max-w-6xl md:mx-auto md:rounded-2xl` |
| Height (mobile) | `min-h-[220px]` | `min-h-[180px]` |
| Height (sm) | `min-h-[260px]` | `min-h-[220px]` |
| Height (desktop) | `min-h-[280px]` | `md:h-[240px]` |
| Button position | `absolute right-3 top-3` | Inline with title row (`absolute bottom-*`) |
| Title layout | Left-aligned, no flex row | `flex items-start justify-between gap-3` with buttons on right |

### Layout structure (after)

```
<div class="relative w-full overflow-hidden min-h-[180px] sm:min-h-[220px] md:min-h-[240px]
            md:max-w-6xl md:mx-auto md:rounded-2xl">
  <!-- Background image or gradient -->
  <img class="absolute inset-0 h-full w-full object-cover" />
  <div class="absolute inset-0 bg-gradient-to-t from-black/85 ..." />

  <!-- Content overlay — bottom anchored -->
  <div class="absolute bottom-0 left-0 right-0 z-10">
    <div class="max-w-6xl mx-auto px-4 pb-5 md:px-8 md:pb-7">

      <!-- Title row: flex with buttons inline -->
      <div class="flex items-start justify-between gap-3">
        <h1 class="text-2xl font-bold ... sm:text-3xl md:text-4xl text-white line-clamp-2 drop-shadow-sm">
          {title}
        </h1>
        <div class="flex shrink-0 gap-1.5">
          <!-- Edit button -->
          <!-- Delete button -->
        </div>
      </div>

      <!-- Badges row below title -->
      <div class="mt-3 flex flex-wrap items-center gap-2">
        <!-- Date, duration, currency badges -->
      </div>
    </div>
  </div>
</div>
```

### Mobile behavior

On mobile (< `md`), the hero stays full-width with `rounded-none`. The title and buttons are on the same row — if the title is long, it wraps (line-clamp-2) and buttons stay right-aligned. The `gap-3` prevents overlap.

### Desktop behavior

On `md+`, the hero is contained within `max-w-6xl mx-auto` with `rounded-2xl` for a card-like appearance. Buttons sit to the right of the title on the same row. The visual distance between title and buttons is minimal (~12px gap).

---

## 2. TripTabBar — Pill Style

### Changes

| Property | Before | After |
|----------|--------|-------|
| Active indicator | Gradient underline (`h-0.5`) | Solid pill background (`bg-primary/10 text-primary rounded-full`) |
| Active text | `text-primary` (color only) | `text-primary` (same, pill provides emphasis) |
| Padding | `py-3.5` | `py-2.5` (more compact) |
| Inactive hover | `hover:text-foreground hover:bg-muted/40` | `hover:text-foreground hover:bg-muted/40` (unchanged) |
| Underline element | `<span className="absolute bottom-0 ...">` | Removed entirely |

### Active tab (after)

```tsx
className={cn(
  "relative flex shrink-0 snap-start items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-full transition-all duration-200",
  isActive
    ? "bg-primary/10 text-primary"
    : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
)}
```

### What stays the same

- Swipe gesture (Iter 90)
- `overflow-x-auto scrollbar-none snap-x snap-mandatory` on mobile
- Icons on all viewports, label hidden on xs (`hidden sm:inline`)
- `sticky z-30 top-0 md:top-[calc(3.5rem+1px)]` positioning
- `bg-background/90 backdrop-blur-xl` background
- `max-w-6xl mx-auto` container

### Removed

- The gradient underline `<span>` element (replaced by pill background)

---

## Files to modify

1. `frontend/src/features/trip/components/TripHero.tsx`
2. `frontend/src/features/trip/components/TripTabBar.tsx`

No changes needed to:
- Page files (`page.tsx`) — they pass the same props
- `NavBar.tsx` — heights unchanged
- `globals.css` — no new utilities needed
