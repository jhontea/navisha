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
- [x] Supported: IDR, USD, JPY, SGD, KRW, MYR, THB, EUR, VND
- [x] Frontend converter page accessible from nav bar — no trip required

### Trip Management
- [x] Create trip (title, description, date range, base currency, cover image, notes)
- [x] List my trips on dashboard (cursor pagination)
- [x] View trip detail with day list
- [x] Delete trip (CASCADE deletes days/activities)
- [x] Edit trip page
- [x] Add/edit/delete transportation records (flight, bus, train, ferry, ship, car)
- [x] Add/edit/delete accommodation records (name, dates, confirmation number)

### Itinerary Builder
- [x] Days auto-generated from trip date range
- [x] Add activity to a day — choose type:
  - **Location**: payload validated (location_name required); Google Maps autofill enabled
  - **Note**: free-text content only
  - **Todo**: checklist with check/uncheck per item
- [x] Edit / delete any activity
- [x] Reorder activities within a day — atomic, full-set required
- [x] Frontend itinerary UI (DayView, ActivityCard, ActivityForm)
- [x] Day-level notes (inline save-on-blur)

### Map View
- [x] Display location-type activities as markers on Google Maps per day
- [x] Draw route between markers in activity order
- [x] Click marker → show activity detail panel
- [x] Toggle between single-day view and full trip view

### Budget Tracker
- [x] Add expense (title, amount, currency, category, optional link to activity)
- [x] Auto-convert to trip base currency via exchange rate (CurrencyFreaks)
- [x] Expense list per trip
- [x] Summary: total spend + breakdown by category
- [x] Budget planning (set per-trip budget, spending tracker, over-budget warning)
- [x] Frontend expense UI: form, list, summary card

---

## Phase 2 — Enhancement

### AI Trip Summary (OpenRouter)
- [x] Generate an AI summary of a trip via OpenRouter LLM
- [x] Aggregates trip info, itinerary, stays, transport, and budget into one narrative
- [x] One summary per trip, cached in `trip_summaries` (regenerate overwrites)
- [x] Soft rate limit: regenerate allowed once per 5 minutes per trip (429 with `retry_after_seconds`)
- [x] Cross-domain data assembled by `internal/integration` adapter (keeps domains isolated)
- [x] Frontend: `TripSummaryCard` on the Overview page — "Generate Summary" is the focal CTA, with regenerate + clear actions and markdown rendering

### Open in Google Maps
- [x] "Open in Google Maps" button in Itinerary Map View panel — opens Google Maps with trip locations as a directions route
- [x] Per-day support: respects the active day filter (single day or "All days")
- [x] Aggregates location-type activities with valid coordinates, filters (0,0) sentinels
- [x] Max 10 waypoints per URL (Google Maps limit)
- [x] Fallback: opens generic Google Maps when no valid coordinates exist
- [x] Pure frontend — no backend changes required

### Auto-Generate Trip from Prompt (OpenRouter)
- [x] User provides destination, date range, description, and currency
- [x] Backend calls OpenRouter LLM with structured JSON schema response format
- [x] AI generates complete trip draft: title, summary, travel style, tips, daily activities
- [x] Max 10 days enforced (backend + frontend) to limit LLM cost/generation time
- [x] Max 6 activities per day enforced
- [x] Activity types: `location` and `note` only (unsupported types dropped)
- [x] Category sanitization: AI-provided categories mapped to valid set (kuliner, belanja, alam, budaya, hiburan, olahraga, transportasi, akomodasi, lainnya)
- [x] AI-provided lat/lng stripped — frontend resolves via Google Places API with destination-restricted bias (~50km radius)
- [x] `ok: false` guard: AI can reject unclear/insufficient prompts with a reason
- [x] Frontend: generate page with form → loading state → DraftPreview → "Create Trip" button
- [x] Backend: `POST /api/v1/trips/generate` (draft) + `POST /api/v1/trips/from-draft` (persist)
- [x] TripDraft includes: destination, travel_style, summary, tips[], per-day theme, per-activity category
- [x] 14 unit tests covering validation, parsing, trimming, prompt building, and schema shape

### Collaboration

- [ ] Share trip via link (view-only)
- [ ] Invite collaborator (can edit)

### Place Search Enhancement
- [x] Google Places Autocomplete when adding location activity
- [x] Show cover photos from Google Places API (auto-fetch on destination select)
- [ ] Place detail photos in activity cards (Phase 3)

### Export
- [~] KML export — skipped (Google Saved Places has no write API)
- [~] Calendar export — removed (2026-06-25)
- [ ] Export itinerary as PDF


### Mobile
- [ ] React Native app sharing same backend API

---

## Acceptance Criteria

Each feature should answer:
1. What does the user see / do?
2. What does the API return?
3. What are the edge cases?
