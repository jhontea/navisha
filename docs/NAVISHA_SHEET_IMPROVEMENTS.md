# Navisha Improvement Ideas from the Google Sheet Template

> Source reviewed: `Copy of Template Itin` — Google Sheet opened in the in-app browser.
> Review date: 2026-07-26.

## Executive summary

The sheet is a strong product reference for turning Navisha from an itinerary generator into a complete trip workspace. Its most valuable pattern is a single trip dashboard that connects planning, logistics, places, checklist progress, and spending.

The highest-value improvements for Navisha are:

1. Make Trip Overview a real trip command center with live progress and budget signals.
2. Add a structured travel checklist with categories, notes, and completion metrics.
3. Improve itinerary editing with day grouping, time, location, and travel transitions.
4. Turn hotel, food, activity, and souvenir data into searchable, filterable trip resources.
5. Connect expenses to itinerary items and support planned-versus-actual reporting.

## What the sheet contains

| Sheet tab | Observed pattern | Navisha opportunity |
| --- | --- | --- |
| Trip Overview | Dates, duration, country/cities, planned budget, actual spending, remaining budget, checklist donut, expense category chart | Trip dashboard and at-a-glance health of a trip |
| Travel Checklist | Checkbox, item, category, notes, check/uncheck/total counts | Reusable checklist templates and progress tracking |
| Hotel Options | Hotel, type, city, price range, clickable OTA links | Accommodation shortlist with comparison and selection |
| Food Map | Name, halal flag, area, category, rating, map link, notes | Place discovery with filters and map/list views |
| Itinerary | Overview by date/day plus detailed entries with time, activity, and location | Editable day planner with schedule and route context |
| Activity & Places | Intended place/activity reference tab; currently appears empty | Destination-aware activity catalog and saved places |
| Souvenir & Oleh-Oleh | Intended recommendation tab; currently appears empty | Shopping recommendations and trip purchase planning |
| Expense Tracker | Expense, source currency, converted IDR, category, notes, category summary | Expense ledger, currency conversion, and budget analytics |

## Recommended product improvements

### P0 — Trip command center

Build a dashboard that answers these questions without opening multiple pages:

- When is the trip and how many days remain?
- Which checklist items are still pending?
- How much budget is planned, spent, and remaining?
- Which spending categories are over budget?
- What is the next itinerary item?
- Which reservations, transport segments, or documents are missing?

Suggested UI:

- Trip header: dates, duration, destinations, cover image.
- Progress cards: checklist completion, itinerary completion, booking completion.
- Budget card: planned, actual, remaining, and projected final spend.
- Category chart with an accessible table alternative.
- “Needs attention” list for overdue tasks, missing locations, and budget overruns.

Relevant Navisha areas already present in the codebase include the trip overview page, dashboard components, expense summary, and budget APIs. The improvement should focus on composing existing data into one coherent view rather than adding another isolated dashboard.

### P0 — First-class checklist

The sheet demonstrates that a checklist is more useful when each item has a category and optional notes. Add:

- Per-trip checklist items with `title`, `category`, `is_completed`, `due_at`, `notes`, and `sort_order`.
- Categories such as Documents & Booking, Money, Connectivity, Essentials, and Health.
- Create-from-template action when a trip is created.
- Progress count and percentage at trip level.
- Optional due dates relative to departure, for example “7 days before departure”.
- Bulk complete, reorder, archive, and add custom item.

Suggested backend route family: `/api/v1/trips/{tripId}/checklist`.

### P0 — Better itinerary model and editor

The sheet separates an overview by day from detailed entries containing date, time, activity, and location. Navisha should preserve that mental model:

- Group itinerary entries by local trip day.
- Support time, duration, location, notes, booking link, and status.
- Show travel transitions between activities, including estimated duration where available.
- Allow drag-and-drop reorder within a day.
- Warn about overlapping times and unrealistic travel gaps.
- Provide day timeline, compact list, and map view modes.
- Keep AI-generated content editable and clearly distinguish generated versus user-edited fields.

The existing itinerary detail and map work provide a good foundation. The main gap is making the itinerary a reliable planning surface after generation.

### P1 — Resource collections for hotels, food, activities, and souvenirs

The hotel and food tabs are essentially structured shortlists. Model them as saved trip resources instead of static text:

- Common fields: name, type, city/area, tags, rating, price range, notes, source URL, map place ID, and `is_visited`/`is_selected`.
- Food-specific fields: halal status, cuisine/category, opening hours, price level.
- Hotel-specific fields: nightly price, dates, booking status, room type.
- Activity-specific fields: duration, ticket price, best time, reservation requirement.
- Souvenir-specific fields: item, shop/area, estimated price, purchase status.
- Filter by city, category, rating, price, halal, selected, and visited.
- Save a resource directly into an itinerary slot.

The blank Activity & Places and Souvenir tabs suggest these should be generated or seeded per destination, while still allowing users to add their own entries.

### P1 — Planned versus actual budget

The sheet compares planned and actual totals by category. Extend the current expense experience with:

- Trip-level budget plus optional category budgets.
- Planned cost attached to itinerary items, hotel stays, and transportation segments.
- Actual expense linked to a plan item or entered independently.
- Category variance: `actual - planned` and percentage variance.
- A projected final spend based on remaining planned items.
- Clear negative-balance state with explanation and suggested actions.
- Expense notes and receipt attachment support as a later phase.

The current expense and currency work already covers important primitives. Preserve the canonical base amount on the backend and treat displayed conversions as derived values.

### P1 — Currency conversion transparency

The sheet shows source currency, exchange rate, and converted IDR. Improve trust by showing:

- Source currency and amount on every expense.
- Rate used and rate timestamp, available on detail/expand.
- Base currency configured at trip level.
- Manual override for cash expenses when the user knows the actual rate.
- Clear indication when a cached or fallback rate is used.

### P2 — Destination-aware starter data

When creating a trip, offer optional starter packs:

- Documents and booking checklist.
- Connectivity and essentials checklist.
- Suggested food, hotel, activity, and souvenir categories.
- Empty-state actions for users who prefer to start manually.

Starter data should be copied into the trip, not shared as mutable global template rows.

## Suggested domain additions

These entities map the spreadsheet concepts into Navisha’s clean architecture:

```text
Trip
├── ChecklistItem
├── ItineraryItem
├── SavedPlace
│   ├── Accommodation
│   ├── FoodPlace
│   ├── Activity
│   └── Souvenir
└── Expense
```

Potential fields:

- `ChecklistItem`: id, trip_id, title, category, notes, due_at, is_completed, sort_order.
- `ItineraryItem`: id, trip_id, day_index, starts_at, duration_minutes, title, location, notes, status, source.
- `SavedPlace`: id, trip_id, kind, name, city, area, tags, rating, map_place_id, source_url, notes, is_selected, is_visited.
- `Expense`: id, trip_id, itinerary_item_id, category, description, amount, currency, base_amount, exchange_rate, rate_at, notes.

Keep `base_amount` and the applied rate immutable after creation unless the user explicitly edits the expense. This makes historical totals reproducible.

## Suggested implementation order

### Milestone 1 — Foundation

- Finalize checklist and itinerary API contracts.
- Add database migrations and indexes by `trip_id`, date/day, category, and completion status.
- Add typed frontend query/mutation hooks.
- Add empty, loading, and error states for each trip section.

### Milestone 2 — Trip workspace

- Build the Trip Overview composition page.
- Add checklist CRUD and progress summary.
- Add planned-versus-actual budget summary.
- Add “needs attention” rules.

### Milestone 3 — Resource and itinerary workflow

- Add saved-place model and filters.
- Link places to itinerary items.
- Add day timeline/list/map view switching.
- Add conflict validation for overlapping itinerary items.

### Milestone 4 — Quality of life

- Starter templates by destination.
- Share/export trip summary.
- Receipt attachments.
- Offline-friendly checklist and itinerary edits.

## Acceptance criteria for the first release

- A user can create a trip and receive an editable checklist template.
- The overview shows checklist progress and budget totals from the same trip data source.
- A user can create, edit, reorder, and complete itinerary items by day.
- A user can save a hotel, food place, activity, or souvenir and filter the list.
- An expense can be entered in a supported source currency and is stored with a reproducible base-currency conversion.
- Budget variance is visible by category and links back to the relevant expenses.
- Every new section has responsive mobile layout plus accessible empty/loading/error states.

## Product cautions

- Treat hotel prices, ratings, opening hours, and availability as time-sensitive reference data; show source and last-checked time.
- Do not make the dashboard depend on client-only calculations when the same totals are needed by APIs or exports.
- Avoid overloading one giant trip page on mobile; use progressive disclosure and focused sections.
- Preserve user edits when AI regeneration is run. Regeneration should create a proposal or version, not silently overwrite the current plan.

