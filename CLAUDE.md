# Navisha — Claude Context

## Product
Travel itinerary app. Users create trips, build day-by-day itineraries, view map routes, and track budget with currency conversion.

## Stack
- **Backend**: Go, Echo framework, PostgreSQL, Redis, JWT + Google OAuth, Viper (config)
- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui, Zustand, TanStack Query
- **Maps**: Google Maps JS API + Places API
- **Currency**: Frankfurter API (free, no key) — supported: IDR, USD, JPY, SGD, KRW
- **Infra (dev)**: Docker Compose (PostgreSQL 16, Redis 7) — containers suffixed `-navisha`

## Repo Structure
```
navisha/
├── backend/       # Go service
├── frontend/      # Next.js app
├── docs/          # Architecture, API, Features docs
└── docker-compose.yml
```

## Key Conventions

### Backend (Go)
- Clean Architecture: domain → usecase → repository → handler
- All errors wrapped with context using `fmt.Errorf("op: %w", err)`
- No global state — inject dependencies via constructor
- DB migrations in `backend/migrations/` as numbered SQL files
- Env config via `.env` loaded by `godotenv`, mapped to typed struct in `config/`
- Routes grouped by feature: `/api/v1/auth`, `/api/v1/trips`, `/api/v1/itinerary`, `/api/v1/budget`

### Frontend (Next.js)
- App Router only — no Pages Router
- Server Components by default; use `"use client"` only when necessary
- Feature-based component structure: `components/features/<feature>/`
- API calls go through `lib/api.ts` (typed fetch wrapper)
- Global state in Zustand stores at `stores/`
- Forms with React Hook Form + Zod validation

## Dev Setup
```bash
# Start infra
docker-compose up -d

# Backend (port 8090)
cd backend && go run ./cmd/server

# Frontend (port 3000)
cd frontend && npm run dev
```

## User
Ahmad is a backend engineer (Go). Needs more guidance on frontend patterns, React/Next.js idioms, and UI composition.
