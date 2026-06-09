# Features

## Phase 1 — MVP

### Auth
- [x] Login with Google (OAuth 2.0)
- [x] Logout
- [x] Protected routes (frontend middleware + backend JWT middleware)

### Currency Converter (standalone tool)
- [ ] Convert any amount between supported currencies
- [ ] Show live exchange rate (Frankfurter API, ECB data)
- [ ] Rate cached in Redis for 1 hour
- [ ] Supported: IDR, USD, JPY, SGD, KRW
- [ ] Accessible from nav bar — no trip required

### Trip Management
- [ ] Create trip (title, description, date range, base currency, cover image, notes)
- [ ] List my trips on dashboard
- [ ] Edit trip details
- [ ] Delete trip
- [ ] Add/edit/delete transportation records (flight, bus, train, ferry, ship, car)
- [ ] Add/edit/delete accommodation records (name, dates, confirmation number)

### Itinerary Builder
- [ ] Days auto-generated from trip date range
- [ ] Add activity to a day — choose type:
  - **Location**: search place via Google Maps, auto-fill name/lat/lng/address, add images + notes
  - **Note**: free-text content only
  - **Todo**: checklist with check/uncheck per item
- [ ] Edit / delete any activity
- [ ] Reorder activities within a day (drag & drop)
- [ ] Day-level notes

### Map View
- [ ] Display location-type activities as markers on Google Maps per day
- [ ] Draw route between markers in activity order
- [ ] Click marker → show activity detail panel
- [ ] Toggle between single-day view and full trip view

### Budget Tracker
- [ ] Add expense (title, amount, currency, category, optional link to activity)
- [ ] Auto-convert to trip base currency via exchange rate
- [ ] Expense list per trip
- [ ] Summary: total spend + breakdown by category
- [ ] No hard budget limit in MVP — tracking only

---

## Phase 2 — Enhancement

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
