# Features

## Phase 1 — MVP

### Auth
- [x] Login with Google (OAuth 2.0)
- [x] Logout
- [x] Protected routes (frontend middleware + backend JWT middleware)

### Currency Converter (standalone tool)
- [x] Convert any amount between supported currencies (backend only)
- [x] Show live exchange rate (CurrencyFreaks API, USD-based; cross rates derived)
- [x] USD-keyed rates cached in Redis for 1 hour
- [x] Supported: IDR, USD, JPY, SGD, KRW
- [ ] Frontend converter page accessible from nav bar — no trip required

### Trip Management
- [x] Create trip (title, description, date range, base currency, cover image, notes)
- [x] List my trips on dashboard (cursor pagination)
- [x] View trip detail with day list
- [x] Delete trip (CASCADE deletes days/activities)
- [ ] Edit trip page (backend ready, frontend page pending)
- [ ] Add/edit/delete transportation records (flight, bus, train, ferry, ship, car)
- [ ] Add/edit/delete accommodation records (name, dates, confirmation number)

### Itinerary Builder
- [x] Days auto-generated from trip date range
- [x] Add activity to a day — choose type (backend only):
  - **Location**: payload validated (location_name required); Google Maps autofill in frontend pending
  - **Note**: free-text content only
  - **Todo**: checklist with check/uncheck per item
- [x] Edit / delete any activity (backend only)
- [x] Reorder activities within a day — atomic, full-set required (backend only)
- [ ] Frontend itinerary UI (DayView, ActivityCard, ActivityForm)
- [ ] Day-level notes (backend column exists, no endpoint yet)

### Map View
- [ ] Display location-type activities as markers on Google Maps per day
- [ ] Draw route between markers in activity order
- [ ] Click marker → show activity detail panel
- [ ] Toggle between single-day view and full trip view

### Budget Tracker
- [x] Add expense (title, amount, currency, category, optional link to activity) — backend only
- [x] Auto-convert to trip base currency via exchange rate (CurrencyFreaks)
- [x] Expense list per trip (backend only)
- [x] Summary: total spend + breakdown by category (backend only)
- [x] No hard budget limit in MVP — tracking only
- [ ] Frontend expense UI: form, list, summary card

---

## Phase 2 — Enhancement

### AI Trip Summary (OpenRouter)
- [x] Generate an AI summary of a trip via OpenRouter LLM
- [x] Aggregates trip info, itinerary, stays, transport, and budget into one narrative
- [x] One summary per trip, cached in `trip_summaries` (regenerate overwrites)
- [x] Soft rate limit: regenerate allowed once per 5 minutes per trip (429 with `retry_after_seconds`)
- [x] Cross-domain data assembled by `internal/integration` adapter (keeps domains isolated)
- [x] Frontend: `TripSummaryCard` on the Overview page — "Generate Summary" is the focal CTA, with regenerate + clear actions and markdown rendering

### Collaboration

- [ ] Share trip via link (view-only)
- [ ] Invite collaborator (can edit)

### Place Search Enhancement
- [ ] Google Places Autocomplete when adding location activity
- [ ] Show place photos from Google Places API

### Export
- [ ] Export itinerary as PDF

### Mobile
- [ ] React Native app sharing same backend API

---

## Acceptance Criteria

Each feature should answer:
1. What does the user see / do?
2. What does the API return?
3. What are the edge cases?
