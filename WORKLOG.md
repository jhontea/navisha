# Worklog

Progress log for Navisha development. Update at the start and end of each session.

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
