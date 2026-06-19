# Worklog

Progress log for Navisha development. Update at the start and end of each session.

---

## 2026-06-19 — Session 14: Map View Live + Places Autocomplete + Activity Form Validation

**Status**: Map renders with numbered, day-colored AdvancedMarkers on a real Cloud Console `mapId`. Location-type activities now use Google Places Autocomplete: search → auto-fill `location_name`, `address`, `lat`, `lng`, `google_place_id`. ActivityForm now blocks per-type required fields client-side instead of relying on the backend 400.

### Completed
- **Maps unblock end-to-end**:
  - Diagnosed: `DEMO_MAP_ID` only works inside Google's own demo; with the project's own key it silently fails to render AdvancedMarker tiles. Cloud Console → Map Management produced a real `mapId = "cc475d9a8bf16e26f8975c02"`, wired into `TripMap.tsx`.
  - Confirmed API restrictions side: Maps JavaScript API + Places API enabled on the key. Billing active (free $200/month tier).
  - `ERR_BLOCKED_BY_CLIENT` on `gen_204` ping = ad blocker hitting Google analytics ping, harmless and ignored.
  - Map container switched from `className="h-[500px]"` to inline `style={{ height: 500, width: "100%" }}` + `Map style={{ width:'100%', height:'100%' }}` after Tailwind arbitrary value wasn't reliably applied in production build.
- **Per-day marker numbering** — `<Pin glyph={String(p.orderIndex + 1)} />` so each pin shows the activity's position within its day (matches the numbered circle in the Itinerary tab; drag-drop reorders flow through to the map).
- **Google Places Autocomplete on activity location**:
  - New component `features/activity/components/LocationAutocomplete.tsx` — wraps `APIProvider` (libraries=`["places"]`) and uses `useMapsLibrary("places")` to attach the legacy `google.maps.places.Autocomplete` widget to a ref'd `Input`. On `place_changed`, emits `{ location_name, address, lat, lng, google_place_id }` from the selected `PlaceResult`. `onPlaceSelect` stashed in a ref so the effect doesn't re-attach the widget on every parent render.
  - `ActivityForm` rewires `location_name` from `register("location_name")` to `Controller` + `LocationAutocomplete`. On select, RHF `setValue` populates `lat`, `lng`, `address`, and the new `google_place_id` field with `shouldValidate: true` so the Zod refines clear.
  - Added `google_place_id: z.string().optional()` to the schema; `buildPayload` now reads `v.google_place_id` (previously hard-coded `""`).
- **`ActivityForm` per-type required-field validation** — wrapped the schema with `.superRefine` that:
  - `location` type → requires non-empty `location_name`
  - `note` type → requires non-empty `note_content`
  - `todo` type → requires at least one item in `todo_items`
  - Fixes the prior backend 400 (`location_name required: invalid activity payload`) by catching the missing field inline before submit. Refine paths target the right field so the error renders next to the input.

### Key Decisions
- **Keep straight polylines, not Directions** — pricing analysis: Directions API costs $5 per 1k requests on the basic tier with a $200/month free credit. For our usage one request per day filter change per trip view, that lands comfortably in the free tier. Still, straight lines visually communicate "next stop" cleanly without an extra API surface; revisit only when users ask for road-following routes.
- **Real `mapId`, not `DEMO_MAP_ID`** — DEMO is only valid against Google's hosted samples. For our own key we always need a project-owned Map ID, otherwise `AdvancedMarker` silently refuses to render its pin layer.
- **`LocationAutocomplete` wraps its own `APIProvider`** — vis.gl dedupes script loads when the same key is used. Two `APIProvider`s (one for the Map tab, one for the Activity form Dialog) cohabit fine and keep the form self-contained. If a third surface needs Maps we'll hoist `APIProvider` to `components/providers.tsx`.
- **Legacy `Autocomplete`, not `PlaceAutocompleteElement`** — the web-component variant is new and still has rough edges with React refs and Dialog portal mounting. Legacy widget is stable, well-documented, and meets our spec.
- **Pin numbering uses `orderIndex + 1`, not a local index over visible points** — so the numbers stay consistent even when the user toggles the "All days" filter (only Day N visible vs everything). Each pin's number always equals its position within its parent day.

### Pending — must come back to
- [ ] **Linked-expense lifecycle for Update + Delete** (Session 13 carryover). Currently only Create writes the linked expense; editing the entity's cost requires a manual Budget tab edit. Decide between schema FK + cascade, or leaving them independent.
- [ ] **`google.maps.Marker` deprecation** — silenced now (we use `AdvancedMarker` everywhere). If we ever fall back to legacy Marker again, console will yell.
- [ ] **Place photo / details enhancement (Phase 2)** — we already store `google_place_id`; Places Details API can later return photos / rating / website. Cost-aware.
- [ ] **Phase 2** still open: share trip via link, collaborator invite, PDF export, mobile app.

### Resume From
**Decide linked-expense lifecycle** (carried from Session 13). Two options remain: schema migration that adds `transportation_id` + `accommodation_id` FK columns on `expenses` with `ON DELETE CASCADE` so the entity owns the expense lifecycle; or leave them independent and require manual cleanup. Option 1 better for data integrity, Option 2 cheaper to ship. After that: pick up the Phase 2 backlog (share-link is the smallest unit of work).

---

## 2026-06-19 — Session 13: Map View, User Handler Tests, Atomic Auto-Expense

**Status**: Map view scaffolded but blocked on Maps API key activation. User-domain handler covered. Transport + Accommodation extended with optional cost that creates a linked expense atomically (single DB transaction). ActivityForm lat/lng input hardened against comma/locale paste.

### Completed
- **Transportation + Accommodation unit tests** (Session 12 carryover) — added `mocks_test.go` + `usecase_test.go` for each. Total 14 transportation cases (`Type.Valid`, `validate` table with arrival-before-departure check, Create success/forbidden/trip-not-found/invalid-type, Update/Delete forbidden+success, List ownership) and 13 accommodation cases (`validate` table including check_out before check_in, Create success/forbidden/trip-not-found/invalid-name/invalid-dates, Update/Delete/List ownership).
- **`internal/user/handler_test.go`** (12 tests, plus `mocks_test.go` w/ `mockUsecase`):
  - `GoogleRedirect`: `oauth_state` cookie HttpOnly + `MaxAge=300`, state value in redirect URL
  - `GoogleCallback`: success path (cookies set, state cleared, redirect to `frontendURL + /auth/callback`), invalid state (missing cookie + value mismatch table), missing code, login fails → 500
  - `Logout`: both token cookies cleared
  - `Refresh`: success (new pair issued), missing cookie 401, invalid token 401 + clears cookies
  - `Me`: success returns user JSON, `ErrNotFound` → 404, other error → 500
  - Uses `httptest` + `echo.New().NewContext` + `c.Set(middleware.UserIDKey, ...)` for `Me`. Helper `findCookie` walks `rec.Result().Cookies()`.
- **`features/map/`** slice (frontend) — Google Maps via `@vis.gl/react-google-maps`:
  - `hooks/useTripLocations.ts` — `useQueries` parallel fetch of activities per day, flatten location-type, filter `(lat||lng)!=0`, sort by `order_index`
  - `components/TripMap.tsx` — `APIProvider` + `Map` (`mapId="DEMO_MAP_ID"`) + `AdvancedMarker` with `Pin` (per-day color from stable 8-color palette by `day_number - 1`). `Polyline` custom component via `useMap()` + native `google.maps.Polyline` (vis.gl ships no Polyline). `FitBounds` auto-zoom on visible points. `InfoWindow` on marker click. Day filter chips ("All days" + per-day colored chip).
  - Trip detail page: new "Map" tab (5 tabs total: Itinerary / Transport / Stay / Map / Budget)
  - `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` set in `frontend/.env.local`
  - **Blocked**: API key needs Maps JavaScript API enabled + HTTP referrer restriction on Cloud Console + billing. User skipped resolution; map renders empty until configured. Code stays in place.
- **`ActivityForm` lat/lng input fix** — paste like `"108.2631914, 21"` previously sent `NaN` to backend → `json.Unmarshal` to `float64` failed → 400. Added `parseCoord(s)` helper above schema that replaces comma → dot and regex-extracts the first `^-?\d+(\.\d+)?` prefix. Wired into Zod `refine` (rejects bad input before submit) and `buildPayload` (safe fallback to 0 only on truly unparseable).
- **Atomic auto-expense for Transport + Accommodation** — single API call creates the entity and (optionally) a linked expense inside one DB transaction:
  - `expense.Repository.CreateTx(ctx, tx, e)` — tx-aware insert
  - `expense.LinkedExpenseCreator` interface + `expense.Usecase.CreateLinkedExpenseTx` impl (re-verifies ownership, runs currency conversion outside the tx, inserts via the caller's tx)
  - `transportation.Repository` + `accommodation.Repository` each add `BeginTx/Commit/Rollback/InsertTx`
  - `transportation.Usecase.Create` + `accommodation.Usecase.Create` now take `context.Context`. If `Cost == nil` they take the simple non-tx Insert path; if `Cost` is set they orchestrate `BeginTx → InsertTx(entity) → CreateLinkedExpenseTx(...)→ Commit`, with `defer Rollback`. Either both rows commit or both roll back.
  - Handlers accept optional `cost: { amount, currency }` in request body.
  - `main.go` injects `expenseUsecase` into both new domain constructors.
  - Existing transport + accommodation tests updated (`NewUsecase` takes `ExpenseCreator`, `Create` takes `ctx`). All 116+ project tests green.
- **Frontend simplified to single call** — `CreateTransportationInput` + `CreateAccommodationInput` types add `cost?: CostInput | null`. Forms pack cost into input directly. Sections drop the earlier two-call orchestration + `useCreateExpense` import — one mutation per Add.

### Key Decisions
- **Cross-domain transaction via interface** — `expense.LinkedExpenseCreator` is defined inside `internal/expense` and re-declared as a structural interface on the caller side (`transportation.ExpenseCreator` / `accommodation.ExpenseCreator`). Same shape, satisfied by `*expense.Usecase`. Lets transportation/accommodation stay free of `import .../expense`.
- **Conversion runs before tx, insert runs inside tx** — `currency.Usecase.Convert` is an HTTP/Redis call; doing it under a lock would hold the row for the network roundtrip. Run it just before the insert; if it fails the linked-insert error rolls everything back.
- **No-cost path stays simple** — `if Cost == nil { return u.repo.Insert(t) }`. Avoids opening a transaction for the common case (an entity logged without a price).
- **Repository owns tx primitives** — `BeginTx / Commit / Rollback` exposed on the Repository interface, mirroring the trip-domain pattern (Session 6). Usecase orchestrates without touching `pgxpool` directly.
- **`parseCoord` extracts first valid number prefix** — covers comma decimals (Indonesian/EU locales) and accidental paste of full coordinate pairs into a single field. Zod `refine` runs the same parser so invalid input is caught client-side before the API ever sees it.
- **Map view ships despite the API issue** — turning off the tab would lose context; an empty map with the dev-mode hint is better than silently disabling the feature.

### Pending — must come back to
- [ ] **Map view live** — needs Google Cloud project to enable Maps JavaScript API + HTTP referrer restrictions + billing. Once unblocked, current code should work; verify InfoWindow + Pin styling on real data.
- [ ] **Activity Places autofill** — same prereq (Maps Places API on the key).
- [ ] **Update transport/accommodation should also re-link expense edits** — currently only Create writes the linked expense. Editing the entity's cost requires the user to edit the expense row in the Budget tab. Decide whether to mirror updates or leave them decoupled.
- [ ] **Delete cascade for linked expense** — deleting a transport/accommodation does not delete its linked expense (no FK in schema). Acceptable for MVP; revisit if user complains about orphan budget rows.
- [ ] **Phase 2**: share trip via link, collaborator invite, PDF export, mobile app.

### Resume From
**Decide on linked-expense lifecycle for Update + Delete.** Two options: (1) tag the expense row with `transportation_id` / `accommodation_id` (schema migration) so the entity owns its expense lifecycle; (2) leave them independent and rely on the user to clean up via the Budget tab. Option 2 is the cheaper MVP path. Beyond that: unblock Maps API (Cloud Console steps documented in Session 13 above) or pick up the Phase 2 backlog.

---

## 2026-06-15 — Session 12: Day Notes + Transportation + Accommodation (Backend + Frontend)

**Status**: Three trip-level features shipped end-to-end. Day notes save inline, transportation and accommodation each get their own domain, slice, and trip detail tab. Trip detail page now has 4 tabs: Itinerary / Transport / Stay / Budget.

### Completed
- **Day notes** (extends `internal/trip` rather than splitting Day into its own domain — Day stays a child of Trip):
  - `repository.go` — `FindDayOwner(dayID)` + `UpdateDayNotes(dayID, notes)` + `ErrDayNotFound`
  - `repository_pg.go` — JOIN `days → trips` for ownership; targeted UPDATE on `days.notes`
  - `usecase.go` — `UpdateDayNotes(userID, dayID, notes)` with ownership check
  - `handler.go` — `PUT /api/v1/days/:day_id/notes` (body `{ notes }`); 404 mapping for `ErrDayNotFound`
  - Mock + tests: 3 new (success / forbidden / day-not-found)
  - Frontend: `tripApi.updateDayNotes` + `useUpdateDayNotes(tripId)`; `DayPanel` gains `notes` prop, inline Textarea above the activity list, save-on-blur dirty check, "Saving…" indicator
- **`internal/transportation/`** — full domain, mirrors activity split:
  - `model.go` — `Type` enum (flight/bus/train/ferry/ship/car/other), `Transportation` struct with `*time.Time` for nullable departure/arrival
  - `repository.go` + `repository_pg.go` — interface w/ `FindTripOwner` + `FindTransportationOwner` JOIN; List ordered by `COALESCE(departure_datetime, created_at)`
  - `usecase.go` — CRUD + ownership; `validate` rejects unknown type and arrival-before-departure
  - `handler.go` — `GET/POST /trips/:trip_id/transportations`, `PUT/DELETE /transportations/:id`. RFC3339 parsing for optional datetimes.
- **`internal/accommodation/`** — full domain:
  - `model.go` — `*float64` lat/lng for nullable; YYYY-MM-DD dates
  - `repository.go` + `repository_pg.go` — same ownership pattern as transportation; List ordered by `check_in ASC`
  - `usecase.go` — CRUD + ownership; `validate` requires `name`, rejects `check_out` before `check_in`
  - `handler.go` — `GET/POST /trips/:trip_id/accommodations`, `PUT/DELETE /accommodations/:id`. Dates parsed/serialized as YYYY-MM-DD.
- **Trip model cleanup** — `Transportation` + `Accommodation` structs removed from `trip/model.go`. Comment replaced with pointer to the new domain packages.
- **Wiring (`cmd/server/main.go`)** — both new domains constructed and routes registered. Build clean, existing tests pass.
- **Frontend slices**:
  - `features/transportation/` — types, api, hooks, `TransportationForm` (7-button type picker with `lucide-react` icons, `datetime-local` inputs with `showPicker` onClick + ISO ↔ local helpers), `TransportationCard` (From→Arrow→To), `TransportationSection` (list + Dialog forms + ConfirmDialog).
  - `features/accommodation/` — same shape; `AccommodationForm` uses Zod `refine` for `check_out >= check_in`; `AccommodationCard` shows date range, location, confirmation number.
- **Trip detail page** — added `Transport` + `Stay` tabs between Itinerary and Budget. Each tab content = its `Section` component.

### Key Decisions
- **Day notes stay in trip domain, not split into `internal/day/`** — per Session 6 decision (Day = child aggregate of Trip, CASCADE-deleted, auto-created). Single new method on trip repo is cheaper than a parallel domain package.
- **Transport / Accommodation each split to own domain** — mirrors `internal/activity` split (Session 8). Both have full CRUD, type/payload validation, dedicated forms. Splitting keeps `internal/trip` lean.
- **`Transportation.{FromLocation, ToLocation}`, not `From/To`** — `from`/`to` are SQL reserved keywords; column names are `from_location`/`to_location`, Go fields follow.
- **Datetime fields nullable** — `*time.Time` on backend, `string | null` on frontend. Forms send `null` when empty. Departure-arrival validation only fires when both are set.
- **Save-on-blur for day notes** — fewer requests than per-keystroke save, instant enough for a text field. Dirty check (`draft !== notes`) avoids no-op PUTs when user just clicks through.
- **Frontend transport form uses `datetime-local`** — native picker, no extra date library. ISO/local converter helpers live in the same file.
- **Tabs grow to 4 (Itinerary / Transport / Stay / Budget)** — kept consistent `flex-1` triggers and `w-full` list. Reorganization didn't touch tab styling settled in Session 11.

### Pending — must come back to
- [ ] Activities: Google Maps Places autofill (blocked on `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`).
- [ ] User handler unit tests (`UsecaseInterface` mock).
- [ ] Transportation + Accommodation unit tests (mirror trip/activity patterns).
- [ ] Map view (Phase 1 feature — render location activities + transport hops as a route).
- [ ] Phase 2 features: share trip, collaborator invite, PDF export, mobile.

### Resume From
**Transportation + Accommodation unit tests** are the closest next deliverable to ship. Mirror `internal/activity/{mocks_test.go, usecase_test.go}` — small mockRepo with trip + entity owner maps, validate-input tests, ownership Forbidden tests, success cases. Targets ~10–15 new tests per domain. After that, choose between Map view (large, Phase 1 closer) or Google Maps Places autofill (small, needs API key).

---

## 2026-06-14 — Session 11: Frontend Currency + Expense UI, Tabs, Trip Edit, AlertDialog

**Status**: Currency converter live as standalone page. Per-trip Budget UI shipped (form with live convert preview, expense list with cross-currency display, stacked-bar summary). Trip detail page reorganized as tabs. Trip edit page complete. All three `window.confirm()` calls replaced with a shared coss AlertDialog wrapper.

### Completed
- **`features/currency/`** — types, api client (`supported / rates / convert`), hooks (`useSupportedCurrencies`, `useConvert` query keyed by `[from, to, amount]` with 5-min stale, `useRates`), `CurrencyConverter` component with two side inputs + swap (`ArrowLeftRight` icon). New `/currency` page; nav button added to dashboard header.
- **`features/expense/`** — types (`ExpenseCategory`, `Expense`, `ExpenseSummary`), api (`list / create / update / delete / summary`), hooks invalidating both list + summary on mutation, `ExpenseForm` with RHF + Zod + live convert preview when source currency ≠ trip base, `ExpenseCard` with cross-currency secondary line + hover delete, `BudgetSummary` with total + stacked-bar by category share + per-category list, `ExpenseSection` composing it all into the trip detail page.
- **Trip detail page**:
  - Restructured around coss `Tabs` (Itinerary / Budget). List shown horizontally on top, content below, `w-full` + `flex-1` triggers so tabs align with body column.
  - Added "Edit" button next to "Delete" linking to new `/trips/[id]/edit`.
- **`/trips/[id]/edit/page.tsx`** — fetches existing trip via `useTrip`, wires `useUpdateTrip`, reuses `TripForm`. Redirects back to detail on save.
- **`TripForm` refactor** — inverted control: form is now pure presentational, takes `initial?: Trip`, `onSubmit`, `isSubmitting`, `submitLabel`. `useCreateTrip` / `useUpdateTrip` + redirect live in the page that owns the mutation. Mirrors `ActivityForm` + `ExpenseForm` pattern.
- **`components/ConfirmDialog.tsx`** — reusable coss `AlertDialog` wrapper: `open`, `onOpenChange`, `title`, `description`, `confirmLabel`, `destructive`, `isPending`, `onConfirm`. `destructive` prop applies the destructive button colors.
- **Replaced 3 `window.confirm()` calls** with `ConfirmDialog`:
  - Trip detail page (delete trip)
  - `DayActivities` (delete activity)
  - `ExpenseSection` (delete expense)
  - Each call site holds the target item in state (`useState<Trip | Activity | Expense | null>`); the dialog reads it for the title; `onConfirm` runs the mutation and `onSettled` closes the dialog. `isPending` disables buttons during the request.
- **coss components added via shadcn CLI**: `tabs`, `alert-dialog`.

### Key Decisions
- **`ConfirmDialog` lives in `components/`, not a feature slice** — used across auth-unrelated features (trip / activity / expense). Generic primitive belongs in shared components.
- **`Tabs` use explicit `flex-col` + `w-full` overrides** — coss `Tabs` root applies `data-horizontal:flex-col`, which depends on a Tailwind v3 `data-horizontal:` variant configuration. Until that's verified, an explicit `className="flex-col"` on the root and `w-full` + `flex-1` on the list/triggers guarantees the layout matches a top-tab pattern.
- **Live convert preview is opt-in** — only fired when `source currency !== trip.base_currency`. Avoids hitting `/currency/convert` when no conversion is needed.
- **Active tab badge styling** — counter chip on the active trigger uses `data-active:bg-muted` so it stays visible against the active pill's white background; inactive triggers use `bg-background/60` to stand out against the muted container.
- **`TripForm` inversion** — caller owns the mutation hook, redirect, and submit label. The form stays a single component for both create and edit pages.

### Pending — must come back to
- [ ] Day-level notes endpoint + UI (column exists, no endpoint yet).
- [ ] Transportation + Accommodation: own domains or finish CRUD inside trip + frontend UI.
- [ ] Activities: optional Google Maps Places autofill (blocked on `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`).
- [ ] User handler unit tests (`UsecaseInterface` mock).
- [ ] Map view (Phase 1 feature, untouched).

### Resume From
**Pick: day-level notes (small) or transport/accommodation (larger).** Day notes — backend `PUT /days/:id/notes` with ownership JOIN, frontend inline textarea in `DayPanel` (collapsible already). Transport / accommodation — split decision (new domain vs trip): see WORKLOG Session 8 "Activity as separate domain" rationale. Activities precedent suggests separate domains because both have their own forms + lifecycle.

---

## 2026-06-13 — Session 10: Currency + Expense Backend

**Status**: Currency and expense backend domains live with tests. CurrencyFreaks API wired, USD-keyed rates cached in Redis, cross-rates derived. Expense auto-converts to trip base currency via cross-domain `Converter` interface.

### Completed
- **Fix stale gitlink** (out-of-band) — `frontend/` was registered in parent index as submodule (mode `160000`, SHA `a60a192c6...`) but had no `.git` dir and no `.gitmodules` entry, so all frontend changes since Session 5 were invisible to parent git. `git rm --cached frontend` + `git add frontend` re-staged 59 frontend files. Added `frontend/.gitignore` entries for `.agents/`, `graphify-out/`, `skills-lock.json` to avoid committing per-machine artifacts. Result: commit `a73f4d9` covering Sessions 5–9 work.
- **`pkg/currency/currencyfreaks.go`** — HTTP client for `https://api.currencyfreaks.com/v2.0/rates/latest`. Returns USD-based rates (free tier). String-typed `rates` parsed to `float64`; date parsed from `"2006-01-02 15:04:05-07"` format. 10s timeout.
- **`internal/currency/`** — full domain:
  - `repository_redis.go` — fetches USD-based map via `pkg/currency.Client`, caches in Redis `rates:USD` for `cfg.Currency.CacheTTL` seconds. `GetRate(base, target)` and `GetRates(base)` derive cross-rates from cache.
  - `rate_math.go` — pure `crossRate(usdRates, base, target)` helper. Same-currency = 1.0; missing/zero entries → error.
  - `usecase.go` — `Rates` (validates supported), `Convert` (rejects negative amounts)
  - `handler.go` — `GET /currency/supported`, `GET /currency/rates?base=…`, `GET /currency/convert?from&to&amount`. All require auth.
- **`internal/expense/`** — full domain:
  - `model.go` — typed `Category` (`accommodation | transport | food | activity | other`); `ActivityID *string` for nullable FK; `Category.Valid()`
  - `repository.go` — added `FindTripOwner` (returns user_id + base_currency for the trip) and `FindExpenseOwner` (JOIN expense→trip)
  - `repository_pg.go` — full CRUD + `Summary(tripID, baseCurrency)` aggregates `converted_amount` GROUP BY category. Shared `scan` helper across QueryRow + Rows
  - `usecase.go` — defines local `Converter` interface (cross-domain rule: no import of currency package). `Create`/`Update` resolve trip base, call `Converter.Convert(in.Currency, base, in.Amount)`, store both raw and converted amount. Ownership via `FindTripOwner` / `FindExpenseOwner`.
  - `handler.go` — `GET/POST /trips/:trip_id/expenses`, `GET /trips/:trip_id/expenses/summary`, `PUT/DELETE /expenses/:id`
- **Wiring (`cmd/server/main.go`)** — added `pkgcurrency.NewClient(cfg.Currency.APIKey)` → `currency.NewRedisRepository` → `currency.NewUsecase` → `currency.NewHandler`. Expense usecase receives `currencyUsecase` as the `Converter`.
- **Config** — `CurrencyConfig.APIKey` field added; `CURRENCYFREAKS_API_KEY` bound via Viper. `.env` + `.env.example` updated.
- **Tests** (~27 new, 77 total project-wide):
  - `internal/currency/rate_math_test.go` — 7 cross-rate cases including USD↔X, X↔Y, same-currency, missing base/target, zero base
  - `internal/currency/usecase_test.go` — mock repo; `Rates` unsupported/success, `Convert` success/negative/repo-error
  - `internal/expense/mocks_test.go` — `mockRepo` with trip+expense indexes, `mockConverter` w/ fixed multiplier
  - `internal/expense/usecase_test.go` — `Category.Valid`, `validateInput` table, Create success/forbidden/trip-not-found/converter-fails/validation-first, Update/Delete/List/Summary ownership
- **Docs updated**:
  - `docs/API.md` — Currency section aligned with impl (auth=yes, `converted_amount` not `converted`, `/supported` endpoint, `fetched_at` per rate). Expense section split list/summary, ownership note, full response shape.
  - `docs/FEATURES.md` — Currency Converter + Budget Tracker backend checked; frontend pending.
  - `docs/ARCHITECTURE.md` — ADR-004 rewritten: CurrencyFreaks chosen over Frankfurter; tree entries updated.
  - `README.md`, `CLAUDE.md`, `backend/CLAUDE.md` — Frankfurter → CurrencyFreaks references.

### Key Decisions
- **`Converter` interface defined in expense, satisfied by `currency.Usecase`** — keeps `internal/expense` zero cross-domain imports per repo rule. Adapter-free, no extra file. Same pattern can hold for future cross-domain coupling.
- **Cache the USD map, derive any base** — CurrencyFreaks free tier is USD-anchored. Caching `rates:USD` once means any `from→to` permutation reuses one upstream call. Avoids N separate cache entries per base.
- **`rate_math.crossRate` extracted as pure function** — testable without Redis/HTTP mocks. Repository code shrunk and unit-tested without touching network.
- **`ActivityID *string` not `string`** — DB column is nullable; matches reality. Pointer cleanly serializes to `null` in JSON.
- **Skip the Frankfurter port that was started** — wrote `pkg/currency/frankfurter.go` before user requested CurrencyFreaks; deleted that file in favour of `currencyfreaks.go`. Function shape and package name reused.

### Pending
- [ ] **Frontend currency converter page** — standalone tool from nav (no trip). Calls `/currency/rates` + `/currency/convert`.
- [ ] **Frontend expense UI** — form + list + summary card per trip; use `/trips/:trip_id/expenses` + `/summary`.
- [ ] Drag-drop reorder polish + AlertDialog replace (carryover from Sessions 7–9).
- [ ] Trip edit page.
- [ ] Day-level notes endpoint + UI.
- [ ] Transportation + Accommodation: move to own domains or finish CRUD inside trip.
- [ ] User handler unit tests (UsecaseInterface mock).
- [ ] Google Maps Places autofill for location activities.

### Resume From
**Frontend expense UI.** `cd frontend`. Build `features/expense/` slice: `types.ts` (Expense, Category, ExpenseSummary), `api.ts` (list / create / update / delete / summary), `hooks/useExpenses.ts` (`useQuery` for list + summary, mutations invalidate both), `components/ExpenseForm.tsx` (RHF + Zod, category Select like trip base_currency, amount + currency input — show converted preview after blur via on-demand `/currency/convert`), `components/ExpenseList.tsx`, `components/BudgetSummary.tsx` (total + by-category bars). Mount in trip detail page below the day list, or new section on `/trips/[id]`.

---

## 2026-06-12 — Session 9: Frontend Activity UI

**Status**: Activities create / view / edit / delete fully wired end-to-end. Trip detail page renders day sections with activities visible by default; click-to-edit cards; per-type icon-button type picker.

### Completed
- **`features/activity/` slice**:
  - `types.ts` — moved Activity / payload types out of `features/trip/types.ts`. Added `CreateActivityInput`, `UpdateActivityInput`, `ReorderInput`, `ActivityListResponse`
  - `api.ts` — `list / create / update / delete / reorder`, all routed through `lib/api.ts`
  - `hooks/useActivities.ts` — `useActivities` (query), `useCreateActivity`, `useUpdateActivity`, `useDeleteActivity`, `useReorderActivities`. All mutations invalidate `["activities","list",dayId]`
  - `components/ActivityCard.tsx` — per-type icon (MapPin / StickyNote / ListChecks) + body switch. Click anywhere on card opens edit dialog (`role="button"`, keyboard Enter/Space). Delete = `Trash2` icon button revealed on hover, `stopPropagation` so it doesn't trigger edit
  - `components/ActivityForm.tsx` — RHF + Zod (v4) + `Controller` for type picker + `useFieldArray` for todo items. Type picker = 3-button grid with icon+label; in edit mode only the locked type is shown as a static chip. Times only rendered for `location` (note + todo have no schedule). Time inputs use `onClick={e => e.currentTarget.showPicker?.()}` so click on the field — not just the calendar icon — opens the native picker
  - `components/DayActivities.tsx` — fetches activities lazily per day (TanStack Query handles cache), lists `ActivityCard` rows + `+ Add activity` button, hosts two `Dialog`s (create + edit)
- **Trip detail page** (`app/(dashboard)/trips/[id]/page.tsx`) — replaced `<details>` collapsible with always-visible day sections. Each day has a header strip + `DayActivities` rendered inline
- **`features/trip/types.ts` slimmed** — removed `Activity`, `ActivityType`, `LocationPayload`, `NotePayload`, `TodoItem`, `TodoPayload` (all moved to activity slice)
- Graph updated (`graphify update .`)

### Two rounds of review fixes
**Round 1**
- Type picker: was `Select` dropdown → now 3-button grid with `lucide-react` icons
- Time inputs auto-open native picker on click (not only icon click)
- Note type hides time fields
- Activities default-visible (removed `<details>` collapsible)
- Card click-to-edit (no Edit button)
- Delete is now `Trash2` icon button, hover-revealed

**Round 2**
- Edit mode: only the selected type chip is shown (other type buttons hidden) — caller passes `lockType` from `DayActivities` edit dialog
- Times also hidden for `todo` type — only `location` carries `start_time`/`end_time` going forward. `ActivityCard` mirrors this in its display

### Key Decisions
- **Times bound to `location` only** — note and todo are time-agnostic. Backend still accepts `start_time`/`end_time` on any type (column is `TEXT NOT NULL DEFAULT ''`); frontend simply never sends them for note/todo. No backend migration needed.
- **Click-to-edit beats explicit Edit button** — fewer UI affordances per row, larger hit target. Keyboard accessibility preserved via `role="button"` + Enter/Space.
- **Delete icon hover-reveal** — avoids visual noise on long itineraries while keeping the action discoverable. `focus:opacity-100` keeps it usable via keyboard tab.
- **Lazy activity fetch per day** — each `DayActivities` mounts its own `useActivities(dayId)`. Cache key per `dayId` so edits stay scoped. Trade-off: N requests on initial render; acceptable for typical trip sizes (~7 days). Switch to batched endpoint if profile shows it matters.
- **Locked type renders as chip in edit mode** — same component handles add + edit. Avoids a second "ActivityCard editing inline" component.

### Pending — must come back to
- [ ] **Drag-drop reorder** — backend `Reorder` endpoint + hook exist; UI not wired. Needs `dnd-kit` (`@dnd-kit/core` + `@dnd-kit/sortable`). Wire in `DayActivities` so dragging cards calls `useReorderActivities` with the new full ID set
- [ ] **Replace `window.confirm()` with coss `AlertDialog`** — currently used for trip delete (`trips/[id]/page.tsx`) and activity delete (`DayActivities`). coss has `alert-dialog` primitive (see `frontend/.agents/skills/coss/references/primitives/alert-dialog.md`)
- [ ] **Google Maps Places autofill for location activities** — `LocationPayload` already has `google_place_id`, `lat`, `lng`, `address` fields. Activity form currently asks user to type these manually. Need Places Autocomplete on `location_name` to populate the rest. Blocked on `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (already in env contract, not set yet)
- [ ] Trip edit page (backend ready)
- [ ] Day-level notes endpoint + UI (column exists)
- [ ] Expense + Currency domain backend (usecase + handler)
- [ ] Transportation + Accommodation: move to own domains or finish CRUD inside trip

### Resume From
**Drag-drop reorder for activities.** `cd frontend && npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`. In `DayActivities.tsx`, wrap the activity list in `DndContext` + `SortableContext`, make `ActivityCard` use `useSortable`. On drag end, compute new ID order and call `useReorderActivities.mutate({ ids })`. Backend enforces full-set match so no partial reorder logic needed on the client.

---

## 2026-06-11 — Session 8: Activity Domain Backend + Graphify + coss Skill

**Status**: Activity domain CRUD + reorder live with payload validation per type. Graphify knowledge graph built. coss ui skill installed. UI library reference corrected across docs.

### Completed
- **coss ui skill** installed via `npx skills add cosscom/coss` → `frontend/.agents/skills/coss/` + `coss-particles/`
- **Docs alignment** — frontend uses **coss ui** (Base UI–backed, shadcn-style CLI), not shadcn/Radix: updated `README.md`, root `CLAUDE.md`, `frontend/CLAUDE.md`, `docs/ARCHITECTURE.md`, `.claude/commands/fe-add-{component,page}.md`. Captured: custom Input/Textarea use `forwardRef` because coss-shipped variants are non-forwardRef and silently drop RHF refs.
- **Graphify** installed: `brew install uv` → `uv tool install graphifyy` → `graphify claude install`. Hooks (`PreToolUse` on Bash/Read/Glob) registered in `.claude/settings.json`. Initial AST-only build: **469 nodes / 748 edges / 38 communities**. `.graphifyignore` + `.gitignore` exclude noise.
- **`internal/activity/` domain** — polymorphic CRUD + reorder:
  - `model.go` — `Type` constants, `Activity` (`Payload json.RawMessage`), `LocationPayload`/`NotePayload`/`TodoPayload`
  - `repository.go` — interface w/ BeginTx/Commit/Rollback + `FindDayOwner`/`FindActivityOwner` (ownership via JOIN)
  - `repository_pg.go` — `ListByDay`, CRUD, `UpdateOrderTx`, `ListIDsByDay`
  - `usecase.go` — `Create` appends at end (`order_index = len(existing)`); `Update` cannot change type; `Reorder` rejects with `ErrReorderMismatch` unless caller sends exactly the day's full ID set; `validatePayload` per type; ownership checks via `apperr.ErrForbidden`
  - `handler.go` — 5 routes: `GET/POST /days/:day_id/activities`, `PUT /days/:day_id/activities/reorder`, `PUT/DELETE /activities/:id`
- **`internal/trip/model.go` slimmed** — removed `Activity`/`ActivityType`/`LocationPayload`/`NotePayload`/`TodoItem`/`TodoPayload` and `Day.Activities` (moved to activity domain). `Transportation` + `Accommodation` parked here until their own domains exist.
- **Tests** (23 passing): `mocks_test.go`, `usecase_test.go` (Create success/empty-day/forbidden/day-not-found/invalid-type/empty-title, Update/Delete forbidden+success, Reorder success/forbidden/mismatch-extra/mismatch-missing/rollback-on-error, `sameSet`), `payload_test.go` (per-type validation roundtrip + `Type.Valid`).
- Wired in `cmd/server/main.go`. Smoke check: routes return 401 without auth.
- **API.md** updated — paths align with implementation (`/days/:day_id/...`, not `/trips/:trip_id/days/...`); reorder body field `ids` not `activity_ids`; added GET response shape + ownership note.
- **FEATURES.md** — itinerary builder backend items checked off; frontend pending.
- **ARCHITECTURE.md** + **backend/CLAUDE.md** — `internal/activity/` added to tree.

### Key Decisions
- **Activity as separate domain** — polymorphic payload + reorder + per-type validation justify splitting from trip; day stays in trip (per earlier feedback). Cross-domain refs by string ID only.
- **Routes nested under `/days/:day_id/`, not `/trips/:trip_id/days/:day_id/`** — `day_id` is globally unique (UUID); requiring trip_id adds no security (server JOINs to verify ownership regardless) and bloats URL. Update/Delete keyed by activity ID directly.
- **Reorder requires full ID set** — catches drift if frontend has stale local state. Single transaction; mismatch detected pre-tx so no work is wasted.
- **Order index assigned by server on create** — `len(existing)` appends. Frontend never sends `order_index` on create; reorder is the only way to mutate position.
- **Update cannot change type** — handler ignores `type` field on PUT. Type change is rare and semantically equivalent to delete+create (different payload shape).
- **Payload validation only when present** — empty payload allowed (some clients may not send one for simple notes); strict shape enforcement when non-empty.
- **Graphify AST-only mode** — no `GEMINI_API_KEY` set, skip Claude subagent dispatch (semantic extraction costs tokens). AST captures structural edges (calls, types, fields). Cross-doc relationships absent until LLM extraction enabled.

### Pending
- [ ] Frontend activity UI: `DayView`, `ActivityCard` per type, `ActivityForm` per type, drag-and-drop reorder
- [ ] Expense + Currency domain backend (usecase + handler)
- [ ] Transportation + Accommodation: move to own domains or build CRUD in trip
- [ ] User handler unit tests (UsecaseInterface mock)
- [ ] Trip edit page on frontend
- [ ] Replace `window.confirm` with coss `Dialog` for delete confirmation

### Resume From
**Frontend activity UI** — `features/itinerary/` slice. Hooks: `useActivities(dayID)`, `useCreateActivity`, `useUpdateActivity`, `useDeleteActivity`, `useReorderActivities`. Components: `DayView` (collapsible per day on trip detail), `ActivityCard` with per-type body, `ActivityForm` with type selector → conditional fields. Trip detail page (`app/(dashboard)/trips/[id]/page.tsx`) currently shows day list; expand each day with `useActivities` lazy fetch. Drag-and-drop with `dnd-kit` for reorder.

---

## 2026-06-10 — Session 7: Frontend Trip CRUD + shadcn Base UI Fix

**Status**: Dashboard shows user info + trip list. Create/view/delete trip flow working end-to-end. Resolved shadcn Base UI ref-forwarding issue blocking RHF.

### Completed
- `features/trip/api.ts` — typed client for list/get/create/update/delete
- `features/trip/hooks/useTrips.ts` — `useTrips` (`useInfiniteQuery` for cursor pagination, `LIMIT=20`), `useTrip`, `useCreateTrip`, `useUpdateTrip`, `useDeleteTrip`; all mutations invalidate `["trips", "list"]`
- `features/trip/components/TripCard.tsx`, `TripList.tsx` (grid + Load more), `TripForm.tsx` (RHF + Zod)
- `features/auth/components/UserBadge.tsx` — avatar/name/email pill driven by `useAuth`
- Pages: `app/(dashboard)/dashboard/page.tsx` (header + UserBadge + New trip + LogoutButton + TripList), `app/(dashboard)/trips/new/page.tsx`, `app/(dashboard)/trips/[id]/page.tsx` (detail + day list + Delete with `confirm()`)
- shadcn install: `textarea`, `select` (form component not shipped by current registry)
- **Fixed shadcn Input + Textarea ref forwarding** — current `npx shadcn add input/textarea` ships Base UI–backed wrappers as **plain function components**, not `React.forwardRef`. RHF's `register("field")` returns a ref callback that React silently drops at non-forwardRef boundaries → field never registered in RHF → submit value `undefined` → Zod 4 returns `"Invalid input: expected string, received undefined"` (truncates to "Invalid input" in UI). Rewrote both to native `<input>`/`<textarea>` with `forwardRef`.

### Key Decisions
- **Cursor pagination in frontend** — `useInfiniteQuery` reads `next_cursor` from each page; `getNextPageParam` returns `undefined` when empty to disable Load more.
- **Controller for shadcn Select** — Base UI Select uses Field context internally; `setValue` alone left RHF unaware of the field. `Controller` from RHF binds value/onChange explicitly.
- **`showPicker()` onClick only** — Chrome rejects `showPicker()` from `onFocus` (programmatic focus / Tab key counts as non-gesture in strict mode). `onClick` fires only from a real user gesture. Wrapped in try/catch as defence.
- **Replace shadcn Input/Textarea wholesale, not Controller every field** — RHF integration is foundational; fixing the primitive once beats wrapping every form field in `Controller`.
- **Form route over modal** — `/trips/new` as a page (matches backend dev's mental model of routing). Modal can come later if multi-form UX demands it.

### Pending
- [ ] Trip update page (form reused with `useUpdateTrip`)
- [ ] Replace `window.confirm` with shadcn `Dialog` for delete confirmation
- [ ] Activities domain (polymorphic location/note/todo) — backend + frontend
- [ ] Transportation, Accommodation domains
- [ ] Expense + Currency domain backend
- [ ] User handler unit tests (UsecaseInterface mock)

### Resume From
**Activities domain backend** — `internal/activity/` package. Polymorphic via `type` discriminator + JSONB payload (already in migration). CRUD endpoints scoped under `/api/v1/trips/:trip_id/days/:day_id/activities`. Ownership cascades: trip → user. Frontend later adds DayView + ActivityForm with per-type field sets.

---

## 2026-06-10 — Session 6: Trip Domain Backend + Tests

**Status**: Trip CRUD backend complete with tests. Cursor pagination working. OAuth flow now redirects to `/auth/callback` to avoid cookie-timing race in Next.js middleware.

### Completed
- **OAuth redirect fix**: backend now redirects to `frontendURL + "/auth/callback"` (not `/dashboard`). New page `app/(auth)/auth/callback/page.tsx` does client-side `router.replace("/dashboard")` after mount — avoids middleware race where cookie set via `Set-Cookie` on redirect wasn't yet visible to Next.js middleware on the immediate `/dashboard` request. Added `/auth/callback` to `AUTH_PATHS` in middleware.
- **Trip domain backend** — `internal/trip/`:
  - `repository.go` — slim interface: BeginTx/Commit/Rollback + List/FindByID/InsertTrip/InsertDays/Update/Delete/ListDays. Removed old broad interface (activities, transports, accommodations deferred).
  - `repository_pg.go` — pg implementation; cursor pagination using row-value comparison `(start_date, id) < ($cursor_date, $cursor_id)` on indexed columns; fetches `limit+1` rows to detect next page.
  - `usecase.go` — Create orchestrates transaction (BeginTx → InsertTrip → InsertDays → Commit), validates dates + currency, generates day rows. List clamps limit (default 20, max 50). Get/Update/Delete enforce ownership via `apperr.ErrForbidden`. Update does NOT regenerate days on date-range change (deferred until itinerary builder).
  - `handler.go` — REST endpoints `GET/POST/PUT/DELETE /api/v1/trips[/:id]`, error mapping (404/403/400/500), date parsing YYYY-MM-DD, cursor query param.
  - Wired in `cmd/server/main.go`.
- **Tests** (19 passing):
  - `mocks_test.go` — `mockRepo` records calls, returns canned values; test helpers (`setupCurrencies`, `date`)
  - `usecase_test.go` — `generateDays`, `validateDates`, Create success/invalid-currency/invalid-dates/rollback-on-failure, Get/Update/Delete ownership checks, List limit clamping
  - `cursor_test.go` — `encodeCursor`/`decodeCursor` roundtrip, empty cursor, invalid base64/format/date

### Key Decisions
- **Cursor pagination over offset** — stable load-more UX; new trip insertions don't shift pages. Cursor = `base64("<RFC3339 start_date>|<uuid>")`.
- **Repository owns transaction lifecycle** — `BeginTx`/`Commit`/`Rollback` exposed as repo methods so usecase doesn't call `tx.Commit()` directly; keeps all DB interaction routed through repository even though pgx.Tx leaks into signatures.
- **Days kept in trip domain** — `ListDays` lives in `trip/repository_pg.go`; insert split into `InsertTrip` + `InsertDays` so usecase orchestrates the transaction (user feedback).
- **Mocks in separate `mocks_test.go`** — keeps test fixtures discoverable, avoids cluttering `usecase_test.go` (user feedback).
- **Update does not regenerate days** — flagged via inline comment; will revisit when itinerary builder needs to handle range changes.

### Pending
- [ ] Frontend trip list page on dashboard (consume cursor pagination)
- [ ] Frontend trip create/edit form
- [ ] Activities domain (polymorphic location/note/todo)
- [ ] Transportation domain
- [ ] Accommodation domain
- [ ] Expense + Currency domain backend
- [ ] User handler unit tests (UsecaseInterface mock)

### Resume From
**Frontend trip list page** — `app/(dashboard)/dashboard/page.tsx` replaces placeholder with trip list. Build `features/trip/hooks/useTrips.ts` (TanStack Query infinite query for cursor pagination), `features/trip/components/TripCard.tsx`, `features/trip/components/TripList.tsx`. API client method in `lib/api.ts` already supports the call. Use shadcn `Card` component for trip rows.

---

## 2026-06-09 — Session 5: Frontend Setup & Auth UI

**Status**: Auth flow fully working end-to-end (frontend + backend). Login, logout, protected routes, landing page all functional. Frontend restructured to feature-slice architecture.

### Completed
- Fixed `tailwind.config.ts` — added all shadcn HSL color tokens (`background`, `foreground`, `card`, `primary`, `secondary`, `muted`, `accent`, `destructive`, `border`, `input`, `ring`, `borderRadius`); fixes `border-border` class not found error
- Frontend dev server running on port 3000, compiles clean
- `middleware.ts` — auth guard: `/` always public, `/login` redirects to `/dashboard` if logged in, all other routes require `access_token` cookie
- Landing page (`/`) — hero section + CTA "Get started" button linking to `/login`
- Dashboard page (`/dashboard`) — placeholder with LogoutButton
- `LogoutButton` — calls `POST /auth/logout`, clears Zustand store + TanStack Query cache, redirects to `/login`
- Backend `GoogleCallback` — now redirects to `frontendURL + "/dashboard"` after login
- **Refactored to feature-slice structure**: removed `hooks/`, `stores/`, `types/`, `components/features/`; all code now under `features/<domain>/`
  - `features/auth/` — `components/`, `hooks.ts`, `store.ts`, `types.ts`
  - `features/trip/` — `components/`, `hooks/`, `types.ts`
  - `features/itinerary/` — `components/`, `hooks/`
  - `features/budget/` — `components/`, `types.ts`
- Updated `docs/ARCHITECTURE.md` — added Frontend Feature-Slice Structure section, Libraries table, Routing & Auth Guard section
- Updated `docs/FEATURES.md` — Auth checklist items marked done
- Updated `frontend/CLAUDE.md` — new structure, libraries table, conventions

### Key Decisions
- **Feature-slice over layer-based** — all code for a feature (components, hooks, store, types) lives together under `features/<name>/`; easier to navigate and scale than `components/features/` + `hooks/` + `stores/` + `types/` scattered across dirs
- **No cross-feature imports** — `trip/` never imports from `auth/`; shared utilities stay in `lib/`
- **`app/` pages are thin shells** — business logic and components live in `features/`, pages just import and compose
- **Middleware reads cookie presence only** — `access_token` is httpOnly so JS can't read its value; middleware just checks `request.cookies.has("access_token")`

### Pending
- [ ] Trip domain: usecase + handler + routes (backend)
- [ ] Trip list page — dashboard shows real trips
- [ ] Trip detail + itinerary builder
- [ ] Expense, Currency, Transportation, Accommodation domains (backend)
- [ ] Handler unit tests (using `UsecaseInterface` mock)

### Resume From
**Trip domain backend** — `internal/trip/usecase.go` + `internal/trip/handler.go`. CRUD for trips: `POST /api/v1/trips`, `GET /api/v1/trips`, `GET /api/v1/trips/:id`, `PUT /api/v1/trips/:id`, `DELETE /api/v1/trips/:id`. Wire in `main.go`. Then build frontend trip list on dashboard.

---

## 2026-06-09 — Session 4: Auth Implementation, Tests & Refactor

**Status**: Auth fully working end-to-end. Google OAuth tested in browser, user persisted in DB. JWT tests passing. Ready for frontend setup.

### Completed
- `internal/user/repository_pg.go` — PostgreSQL impl: `FindByID`, `FindByGoogleID`, `Upsert` (ON CONFLICT upsert)
- `internal/user/usecase.go` — `GoogleLogin`, `Me`, `RefreshTokens`, `issueTokens`, `fetchGoogleUserInfo`; added `UsecaseInterface` so handler can be tested with a mock
- `internal/user/handler.go` — `GoogleRedirect`, `GoogleCallback`, `Logout`, `Refresh`, `Me`; CSRF state cookie, httpOnly JWT cookies, redirect to frontendURL post-login
- `cmd/server/main.go` — wired user domain (repo → usecase → handler), auth middleware, routes registered under `/api/v1`
- `config.yaml` — updated `access_ttl` from 900 → 3600 (1 hour)
- Google OAuth credentials set in `.env` — end-to-end flow tested in browser
- `pkg/jwt/jwt_test.go` — 8 unit tests: generate/validate access & refresh, cross-token rejection, expired token, tampered signature, empty token (all passing)
- **Refactor**: `Handler` now depends on `UsecaseInterface` (not `*Usecase`) — enables mock-based handler testing

### Key Decisions
- **`UsecaseInterface`** added to `user/usecase.go` — handler depends on interface so tests don't require DB or live Google OAuth
- **access_ttl = 1 hour** — longer than standard 15min for development comfort; frontend still does token refresh before expiry
- **`frontendURL` in handler** — after OAuth callback, backend redirects to frontend (`http://localhost:3000`); expected ERR_CONNECTION_REFUSED until frontend is set up
- **JWT unit tests over integration tests** — `pkg/jwt` is pure logic, no external deps; repository integration tests deferred until later

### Pending
- [ ] Frontend Next.js project setup
- [ ] Trip domain: usecase + handler + routes
- [ ] Expense, Currency, Transportation, Accommodation domains
- [ ] Handler unit tests (using `UsecaseInterface` mock)

### Resume From
**Frontend setup** — `cd frontend`, init Next.js 14 with App Router + TypeScript + Tailwind, install shadcn/ui, TanStack Query, Zustand. Create folder structure per `frontend/CLAUDE.md`. First page: auth (login with Google button that hits `GET /api/v1/auth/google`).

---

## 2026-06-08 — Session 3: Migration, Fixes & Pre-Auth Cleanup

**Status**: All backend foundations solid. Migration applied, build clean. Ready to implement Auth next session.

### Completed
- Fixed typo `IsSuppported` → `IsSupported` in `currency/model.go`
- Fixed `config.go` — `BindEnv` errors now handled (loop with error check)
- Fixed `currency.SupportedCurrencies` now populated from config at server startup in `main.go`
- Created `pkg/oauth/google.go` — `NewGoogleConfig()` + `GoogleUserInfo` struct
- Created `migrations/001_init.sql` — all 7 tables: users, trips, days, activities, transportations, accommodations, expenses
- Applied migration successfully to local PostgreSQL — all tables verified
- Created `.gitignore` — protects `.env`, `node_modules`, `.next`, `bin/`, `.DS_Store`
- Build clean after all changes

### Key Decisions
- **UUID for all PKs** — IDs appear in public URLs; sequential ints are guessable
- **`days` table** — kept as-is (not `trip_days`); relation to trip already expressed via `trip_id` FK
- **`day_number` kept** — stored for display convenience ("Day 1", "Day 2") to avoid JOIN to trips every time
- **`activity_id` in expenses is nullable** — expenses are trip-level and standalone; linking to an activity is optional
- **expense columns** — `amount`+`currency` = original payment; `converted_amount`+`base_currency` = trip base currency equivalent (e.g. 500 USD → 8,100,000 IDR)
- **`from_location`/`to_location`** in transportations (not `from`/`to`) — avoids reserved keyword conflicts in SQL

### Pending
- [ ] Auth implementation (Google OAuth + JWT)
- [ ] Frontend Next.js project setup
- [ ] All features (see `docs/FEATURES.md`)

### Resume From
**Auth implementation** — create `internal/user/usecase.go` and `internal/user/handler.go`. Wire Google OAuth flow: `GET /api/v1/auth/google` (redirect) → `GET /api/v1/auth/google/callback` (exchange code, fetch userinfo from Google, upsert user in DB, issue JWT + refresh token as httpOnly cookies). Register routes in `cmd/server/main.go`. Use `pkg/oauth/google.go` for OAuth config and `pkg/jwt/jwt.go` for token issuance.

---

## 2026-06-08 — Session 2: Backend Setup & Domain Structure

**Status**: Backend scaffold complete. Server boots, DB and Redis connections verified. Ready to implement Auth.

### Completed
- `go mod init` and all dependencies installed (Echo, pgx, Viper, godotenv, go-redis, golang-jwt, oauth2, uuid)
- Clean domain-based folder structure under `internal/` (user/, trip/, expense/, currency/, apperr/, middleware/)
- Viper config loader: `config.yaml` for non-secrets + `.env` for secrets, env vars override YAML
- `config.yaml` and `.env.example` created
- All domain model and repository interface files:
  - `user/model.go`, `user/repository.go`
  - `trip/model.go` (Trip, Day, Activity polymorphic, Transportation, Accommodation), `trip/repository.go`
  - `expense/model.go`, `expense/repository.go`
  - `currency/model.go` (with `IsSupported()`, `Symbol()`), `currency/repository.go`
  - `apperr/errors.go` — shared sentinel errors
- `pkg/jwt/jwt.go` — JWT service (GenerateAccessToken, GenerateRefreshToken, Validate*)
- `internal/middleware/auth.go` — Echo JWT middleware (cookie + Bearer fallback)
- `cmd/server/main.go` — Echo server with graceful shutdown, DB+Redis ping on startup, CORS
- docker-compose verified: `postgres-navisha` on 5439, `redis-navisha` on 6389
- Server starts and `/health` returns `{"status":"ok"}`

### Key Decisions
- **Domain-driven structure**: each domain (user, trip, expense, currency) is a self-contained package with model/repository/usecase/handler — not layer-based folders
- **Cross-domain**: domains reference each other by string ID only, no cross-imports; shared errors in `apperr/`
- **Domain errors**: each domain owns its own errors (e.g. `trip.ErrNotFound`) alongside the repository interface
- **DATABASE_URL**: single connection string in `.env` (includes user:password) — standard format compatible with cloud providers
- **DB/Redis ports**: PostgreSQL 5439, Redis 6389 (avoids conflicts with other local Docker services)

### Pending
- [ ] Frontend Next.js project setup
- [ ] DB migrations
- [ ] Auth implementation (Google OAuth + JWT)
- [ ] All features (see `docs/FEATURES.md`)

### Resume From
**Auth implementation** — `internal/user/usecase.go` + `internal/user/handler.go` for Google OAuth callback, JWT issuance, and `/api/v1/auth/*` routes wired in `main.go`.

---

## 2026-06-08 — Session 1: Project Planning & Documentation

**Status**: Planning complete. No code yet.

### Completed
- Finalized full tech stack (Go + Echo, Next.js 14, PostgreSQL, Redis, Google Maps, Frankfurter API)
- Chose Google OAuth-only auth — no password management, simpler attack surface
- Designed domain model:
  - `Activity` is polymorphic: type `location | note | todo` with JSONB payload
  - `Trip` has trip-level `transportations[]` and `accommodations[]`
  - Currency converter as a standalone feature (no trip required)
- Created documentation:
  - `docs/ARCHITECTURE.md` — system design, entity model, ADRs
  - `docs/API.md` — all endpoints + request/response shapes
  - `docs/FEATURES.md` — Phase 1 & 2 feature checklist
  - `CLAUDE.md`, `backend/CLAUDE.md`, `frontend/CLAUDE.md` — Claude context files
  - `docker-compose.yml` — PostgreSQL + Redis with `navisha-dev` naming
  - `README.md` — open-source GitHub readme

### Key Decisions
- **Backend port**: 8090
- **Supported currencies**: IDR, USD, JPY, SGD, KRW
- **Config strategy**: `config.yaml` for non-secrets (git-tracked) + `.env` for secrets, merged via Viper
- **Docker naming**: project `navisha-dev`, containers suffixed `-navisha`, network `navisha-dev-network`
- **Activity payload**: JSONB column in DB, validated at usecase layer per type

### Pending
- [ ] Backend Go project setup (`go mod init`, folder structure, Viper config)
- [ ] Frontend Next.js project setup
- [ ] DB migrations
- [ ] Auth implementation (Google OAuth + JWT)
- [ ] All features (see `docs/FEATURES.md`)

### Resume From
**Backend setup** — `go mod init`, clean architecture folder structure, Viper config loader, verify docker-compose works.

---

<!-- Session template:

## YYYY-MM-DD — Session N: [Title]

**Status**: ...

### Completed
- ...

### Key Decisions
- ...

### Pending
- [ ] ...

### Resume From
...

-->
