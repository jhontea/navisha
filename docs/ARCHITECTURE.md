# Architecture

## System Overview

```
Browser/Mobile
     │
     ▼
Next.js Frontend (Port 3000)
     │ HTTPS REST
     ▼
Echo HTTP Server (Port 8090)
     │
     ├── PostgreSQL (Port 5439) — persistent data
     └── Redis (Port 6389)      — session cache, exchange rates
```

## Backend — Domain-Driven Structure

Each feature lives in its own package under `internal/`. Every domain package is self-contained:

```
internal/
├── user/        model.go · repository.go · usecase.go · handler.go
├── trip/        model.go · repository.go · usecase.go · handler.go
├── expense/     model.go · repository.go · usecase.go · handler.go
├── currency/    model.go · repository.go · usecase.go · handler.go
├── apperr/      shared sentinel errors (ErrNotFound, ErrUnauthorized …)
└── middleware/  cross-cutting: JWT auth, CORS
```

**Dependency rule within each domain**: `handler` → `usecase` → `repository` (interface) — no reverse imports.

**Cross-domain**: domains reference each other by string ID only (e.g. `expense.TripID string`). No cross-imports between domain packages. Shared errors in `apperr/`.

## Domain Entities

```
User
├── id (uuid), google_id, email, name, avatar_url
└── created_at, updated_at

Trip
├── id, user_id, title, description, cover_image_url
├── start_date, end_date
├── base_currency (ISO 4217, e.g. "IDR")
├── notes (general trip notes)
└── created_at, updated_at

Transportation (trip-level)
├── id, trip_id
├── type: flight | bus | train | ferry | ship | car | other
├── label, operator, reference_number
├── from, to
├── departure_datetime, arrival_datetime
└── notes

Accommodation (trip-level)
├── id, trip_id
├── name, location_name, lat, lng, google_place_id
├── check_in, check_out
├── confirmation_number
└── notes

Day
├── id, trip_id, date, day_number
└── notes

Activity (day-level, polymorphic)
├── id, day_id, type, title
├── start_time, end_time (optional, used by location type)
├── order_index
├── payload (JSONB) — type-specific data:
│   ├── location: { location_name, lat, lng, google_place_id, address, notes, image_urls[] }
│   ├── note:     { content }
│   └── todo:     { items: [{ id, text, completed }] }
└── created_at, updated_at

Expense
├── id, trip_id, activity_id (nullable)
├── title, amount, currency
├── converted_amount, base_currency
└── category: accommodation | transport | food | activity | other

ExchangeRate (Redis only, not persisted to DB)
├── base, target, rate
└── fetched_at (TTL 1h)
```

## Frontend — Feature-Slice Structure

Each feature lives in its own slice under `src/features/`. Every slice is self-contained:

```
src/
├── features/
│   ├── auth/
│   │   ├── components/   LoginButton.tsx, LogoutButton.tsx
│   │   ├── hooks.ts      useAuth (TanStack Query), useLogout (mutation + redirect)
│   │   ├── store.ts      Zustand auth store (user, isLoading)
│   │   └── types.ts      User
│   ├── trip/
│   │   ├── components/   TripCard, TripForm, TripDetail (to be built)
│   │   ├── hooks/        useTrips, useCreateTrip (to be built)
│   │   └── types.ts      Trip, Day, Activity, Transportation, Accommodation
│   ├── itinerary/
│   │   ├── components/   DayView, ActivityCard, ActivityForm (to be built)
│   │   └── hooks/        (to be built)
│   └── budget/
│       ├── components/   ExpenseList, ExpenseForm, BudgetSummary (to be built)
│       └── types.ts      Expense, ExpenseSummary, CurrencyRate
├── components/
│   └── ui/               shadcn/ui primitives — never modified directly
├── lib/
│   ├── api.ts            shared typed fetch wrapper (credentials: include, ApiError class)
│   └── utils.ts          cn(), formatCurrency(), formatDate(), formatDateRange()
└── app/                  Next.js App Router pages (thin — import from features/)
    ├── (auth)/login/     login page
    ├── (dashboard)/      protected pages
    └── page.tsx          landing page
```

**Rule**: `app/` pages are thin shells — they import components from `features/`. No business logic in pages. No cross-feature imports (e.g. `trip/` must not import from `auth/`).

**State split**:
- Server state (trips, activities, expenses) → TanStack Query (`useQuery`, `useMutation`)
- UI/session state (current user, map open/closed) → Zustand

## Frontend Libraries

| Library | Version | Purpose |
|---------|---------|---------|
| Next.js | 14 (App Router) | Framework, routing, SSR |
| React | 18 | UI rendering |
| TypeScript | 5 | Type safety |
| Tailwind CSS | 3 | Styling (utility-first) |
| shadcn/ui | latest | Accessible UI primitives built on Radix UI |
| TanStack Query | v5 | Server state: caching, loading/error states, background refetch |
| Zustand | v4 | Client/UI state: lightweight, no boilerplate |
| React Hook Form | v7 | Form state management, performant re-renders |
| Zod | v3 | Schema validation — used with RHF for form validation |

## Routing & Auth Guard

Next.js `middleware.ts` runs on every request before rendering:

```
/ (landing)         → always public
/login              → public; if cookie access_token exists → redirect /dashboard
/dashboard, /trips/* → protected; if no cookie → redirect /login
```

After Google OAuth callback, backend sets `access_token` + `refresh_token` httpOnly cookies and redirects to `/dashboard`.

## Authentication Flow

Google OAuth only — no local email/password.

```
GET  /api/v1/auth/google          → redirect to Google consent screen
GET  /api/v1/auth/google/callback → exchange code → upsert user in DB → issue JWT
POST /api/v1/auth/logout          → clear httpOnly cookies
GET  /api/v1/auth/me              → return current user from JWT
```

**JWT Strategy**: access token (1h) + refresh token (7d), both stored in httpOnly cookies. Prevents XSS token theft. SameSite=Strict for CSRF mitigation.

**Google OAuth scopes**: `openid`, `email`, `profile`

## Activity Polymorphism

Activities use a single DB table with a `type` discriminator and a `payload` JSONB column. This avoids nullable columns and extra joins, while keeping queries simple. Payload is validated at the application layer per type.

```
activities
├── id
├── day_id
├── type          -- 'location' | 'note' | 'todo'
├── title
├── start_time
├── end_time
├── order_index
└── payload       -- JSONB, schema depends on type
```

## API Versioning

All endpoints prefixed with `/api/v1/`. Breaking changes get `/api/v2/` — old version stays until clients migrate.

## Architecture Decision Records

### ADR-001: Echo over Gin
Echo has cleaner middleware chaining and built-in binder/validator. Equivalent performance.

### ADR-002: Google-only Auth
Eliminates password management, forgot-password flows, and email verification. Reduces attack surface. Users already have Google accounts. Easy to add more OAuth providers (Apple, GitHub) using the same pattern.

### ADR-003: Google Maps over Mapbox
Google Places Autocomplete has better POI data quality and global coverage for travel use cases.

### ADR-004: Frankfurter API for currency
Free, no API key required, powered by ECB data. Sufficient for MVP. Swap to Open Exchange Rates for real-time forex if needed.

### ADR-005: JWT in httpOnly cookie
Prevents XSS token theft vs localStorage. CSRF mitigated via SameSite=Strict.

### ADR-006: JSONB payload for polymorphic activities
Three activity types (location, note, todo) have vastly different fields. JSONB avoids sparse nullable columns and extra join tables, while still being queryable. Validation happens in the usecase layer per type.
