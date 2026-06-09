# Worklog

Progress log for Navisha development. Update at the start and end of each session.

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
