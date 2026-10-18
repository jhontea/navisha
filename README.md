# Navisha

> Plan your journey. Own your adventure.

**Navisha** is an open-source travel itinerary app. Build day-by-day trip plans, visualize routes on a map, track expenses across currencies, and let AI help generate your itinerary — all from a clean mobile-first interface.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Status](https://img.shields.io/badge/status-active-success.svg)
![Stack](https://img.shields.io/badge/stack-Go%20%7C%20Next.js%2014-00ADD8.svg)
![AI](https://img.shields.io/badge/AI-DeepSeek%20%7C%20OpenRouter-8B5CF6.svg)

---

## Features

### Trip Planning
- **Day-by-day itinerary** — Add activities (location pins, notes, to-dos) to each day
- **Map visualization** — View all activity locations and daily routes with MapLibre or Google Maps
- **AI trip generation** — Describe your destination and let AI build a complete itinerary with 6 travel styles (Backpacker, Cultural, Luxury, Nature, Foodie, Balanced)
- **AI trip summary** — Get a rich markdown summary with budget breakdowns, local tips, and recommendations in 5 style variants

### Logistics
- **Transportation** — Log flights, buses, trains, ferries, and rides
- **Accommodation** — Track hotel check-ins, addresses, and booking references
- **Google Maps integration** — Search places with autocomplete, open locations directly in Google Maps

### Budget
- **Expense tracker** — Log expenses per trip with categories (food, transport, stay, activity, shopping, souvenir)
- **Multi-currency** — Automatic conversion via CurrencyFreaks API (IDR, USD, JPY, SGD, KRW, MYR, THB, EUR, VND)
- **Budget ring** — Visual budget health with percentage ring and category distribution bar
- **Currency converter** — Standalone quick converter tool

### Platform
- **Google Sign-In** — Simple OAuth 2.0 authentication, no passwords
- **Mobile-first design** — Responsive layout with bottom tab nav on mobile, top header on desktop
- **Rate limiting** — Redis-backed sliding window rate limiter (100/min general, 5/min AI)
- **Structured logging** — JSON slog output for production observability

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Go 1.25+, Echo v4, pgx v5 (PostgreSQL 17), Redis 7 |
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, coss ui (Base UI) |
| AI / LLM | DeepSeek V4, OpenRouter (multi-provider fallback) |
| Maps | MapLibre GL JS + OpenStreetMap, optional Google Maps JS API |
| Currency | CurrencyFreaks API |
| Auth | Google OAuth 2.0 + JWT (httpOnly cookie) |
| Infra (dev) | Docker Compose or native PostgreSQL + Redis |
| CI/CD | GitHub Actions → VPS via SSH |

---

## Screenshots

<p align="center">
  <em>Screenshots coming soon — mobile-first trip planning, AI itinerary generation, map view, and budget tracking.</em>
</p>

---

## Getting Started

### Prerequisites

- Go 1.25+
- Node.js 22+
- PostgreSQL 17+ and Redis 7+ (via Docker, or installed natively)
- Google OAuth credentials (login is Google-only)
- Geoapify API key for the default location autocomplete provider
- Optional: Google Cloud project with Maps JS API when Google mode is enabled

### 1. Start PostgreSQL + Redis

**Option A: Docker**

```bash
docker compose -f docker-compose.dev.yml up -d
```

This starts Postgres on `localhost:5439` (user/password/db: `navisha`) and
Redis on `localhost:6389`, matching `backend/.env.example`.

**Option B: native install (no Docker)**

Use a local PostgreSQL and Redis (on Windows, e.g. the
[redis-windows](https://github.com/redis-windows/redis-windows) build).
Create the database, then point `DATABASE_URL` / `REDIS_URL` at them:

```bash
psql -U postgres -c "CREATE USER navisha WITH PASSWORD 'navisha';" -c "CREATE DATABASE navisha OWNER navisha;"
```

> **The server runs all pending migrations on every start.** Never point a
> local `.env` at the production database unless you mean to. Prefer a
> separate database (or a Neon branch) for development.

### 2. Configure and run the backend

```bash
cd backend
cp .env.example .env   # fill in secrets
go run ./cmd/server    # http://localhost:8090, health check at /health
```

Key env vars: `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`,
`SHARE_LINK_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
`GEOAPIFY_API_KEY`, `CURRENCYFREAKS_API_KEY`, and an LLM key
(`DEEPSEEK_API_KEY` or `OPENROUTER_API_KEY`). Register
`http://localhost:8090/api/v1/auth/google/callback` as an OAuth redirect URI.

Non-secret config lives in `backend/config.yaml`; env vars override it.

Check migration status without starting the server:

```bash
go run ./cmd/migrate -status
```

### 3. Configure and run the frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev            # http://localhost:3000
```

Defaults: Geoapify autocomplete (proxied by the backend so its key stays
private) and MapLibre with an OpenFreeMap/OSM basemap. Set
`NEXT_PUBLIC_MAP_PROVIDER=google` (plus `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`) to
use Google, or `disabled` to turn the map off. Changing a `NEXT_PUBLIC_*`
value requires restarting the dev server.

For production traffic, review the tile provider's terms or configure
`NEXT_PUBLIC_MAP_TILE_URL` / `NEXT_PUBLIC_MAP_ATTRIBUTION` (and
`MAP_TILE_UPSTREAM_URL` for the same-origin tile proxy).

### 4. Checks

| | Command |
|---|---|
| Backend tests | `cd backend && go test ./...` |
| Backend lint | `cd backend && golangci-lint run ./...` |
| Frontend lint / types / tests | `cd frontend && npm run lint && npm run typecheck && npm test` |

The same checks run in CI on every pull request (`.github/workflows/ci.yml`).
Merging to `main` deploys to production (`.github/workflows/deploy.yml`).

---

## Project Structure

```
navisha/
├── backend/              # Go API server (Clean Architecture)
│   ├── cmd/server/       # Main server entrypoint
│   ├── cmd/migrate/      # Standalone migration CLI
│   ├── internal/         # Domain packages (trip, activity, expense, etc.)
│   ├── migrations/       # Numbered SQL migration files
│   ├── pkg/              # Shared packages (jwt, llm, currency, oauth)
│   └── config/           # Typed config struct + YAML
├── frontend/             # Next.js 16 web app
│   ├── src/app/          # App Router pages
│   ├── src/features/     # Feature-slice architecture
│   ├── src/components/   # Shared UI components
│   └── src/lib/          # Utilities, API client, categories
├── deploy/               # Nginx config for production
├── docker-compose.dev.yml  # Dev infrastructure (PostgreSQL + Redis)
└── docker-compose.prod.yml # Production (images from GHCR)
```

## Links

- [Privacy Policy](https://navisha.cloud/privacy)
- [Terms of Service](https://navisha.cloud/terms)
- [Contact](https://navisha.cloud/contact)

## Roadmap

Core features (trips, itinerary, map, transport, stay, budget, currency
converter, AI generation and summary, share links) are shipped. Current work
is tracked in [docs/PLANNING_REDESIGN_V2.md](docs/PLANNING_REDESIGN_V2.md).

---

## Contributing

Contributions are welcome! Please open an issue first to discuss what you'd like to change.

1. Fork the repo
2. Create a feature branch (`git checkout -b feat/your-feature`)
3. Commit your changes
4. Open a pull request

---

## License

MIT © 2025–2026 Navisha
