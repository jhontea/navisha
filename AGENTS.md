# Navisha — Codex Context

## Product
Travel itinerary app. Users create trips, build day-by-day itineraries, view map routes, and track budget with currency conversion.

## Stack
- **Backend**: Go, Echo framework, PostgreSQL, Redis, JWT + Google OAuth, Viper (config)
- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, coss ui (Base UI–backed, shadcn-style CLI), Zustand, TanStack Query
- **Maps**: Google Maps JS API + Places API
- **Currency**: CurrencyFreaks API (USD-based, free tier w/ key) — supported: IDR, USD, JPY, SGD, KRW
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
- Feature-slice structure: `src/features/<feature>/{components,hooks,store.ts,types.ts}`
- coss ui primitives in `src/components/ui/` (Base UI–backed, do not modify generated files)
- API calls go through `lib/api.ts` (typed fetch wrapper)
- Zustand stores live inside each feature slice (e.g. `features/auth/store.ts`)
- Forms with React Hook Form + Zod (v4) validation

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

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
