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
- **Multi-currency** — Automatic conversion via CurrencyFreaks API (IDR, USD, JPY, SGD, KRW, EUR, GBP, AUD, MYR, THB, CNY, VND)
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
| Backend | Go 1.22+, Echo v4, pgx v5 (PostgreSQL 16), Redis 7 |
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS, coss ui (Base UI) |
| AI / LLM | DeepSeek V4, OpenRouter (multi-provider fallback) |
| Maps | MapLibre GL JS + OpenStreetMap, optional Google Maps JS API |
| Currency | CurrencyFreaks API |
| Auth | Google OAuth 2.0 + JWT (httpOnly cookie) |
| Infra (dev) | Docker Compose (PostgreSQL + Redis) |
| CI/CD | GitHub Actions → VPS via SSH |

---

## Screenshots

<p align="center">
  <em>Screenshots coming soon — mobile-first trip planning, AI itinerary generation, map view, and budget tracking.</em>
</p>

---

## Getting Started

### Prerequisites

- Go 1.22+
- Node.js 20+
- Docker & Docker Compose
- Google OAuth credentials
- Geoapify API key for the default location autocomplete provider
- Optional Google Cloud project with Maps JS API when Google mode is enabled

### 1. Clone the repo

```bash
git clone https://github.com/yourusername/navisha.git
cd navisha
```

### 2. Start infrastructure

```bash
docker-compose up -d
```

This starts:
- `postgres-navisha` on port 5432
- `redis-navisha` on port 6379

### 3. Configure backend

```bash
cd backend
cp .env.example .env
# Fill in your secrets in .env
```

Key env vars to set:
```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
JWT_SECRET=
JWT_REFRESH_SECRET=
GEOAPIFY_API_KEY=
```

Non-secret config lives in `backend/config.yaml` — edit as needed.

### 4. Run the backend

```bash
cd backend
go run ./cmd/server
# Server starts on http://localhost:8090
```

### 5. Configure frontend

```bash
cd frontend
cp .env.example .env.local
# Default: Geoapify autocomplete, MapLibre + an OSM-based CARTO basemap
# To restore Google: set NEXT_PUBLIC_LOCATION_PROVIDER=google,
# NEXT_PUBLIC_MAP_PROVIDER=google, and NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
```

Location and map providers are independent. Geoapify requests are proxied by
the Go backend so its key stays private. Map view defaults to `maplibre`; set
`NEXT_PUBLIC_MAP_PROVIDER=google` to restore Google or `disabled` to turn the
map off. Google scripts are loaded only in Google mode. Changing a
`NEXT_PUBLIC_*` value requires restarting/rebuilding the frontend.

The default CARTO basemap uses OpenStreetMap data. For production traffic,
review the provider terms or configure `NEXT_PUBLIC_MAP_TILE_URL` and
`NEXT_PUBLIC_MAP_ATTRIBUTION` for another tile provider whose capacity and
terms fit the deployment. The default same-origin tile route avoids browser
cross-origin restrictions; its upstream can be changed with
`MAP_TILE_UPSTREAM_URL`.

### 6. Run the frontend

```bash
cd frontend
npm install
npm run dev
# App starts on http://localhost:3000
```

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
├── frontend/             # Next.js 14 web app
│   ├── src/app/          # App Router pages
│   ├── src/features/     # Feature-slice architecture
│   ├── src/components/   # Shared UI components
│   └── src/lib/          # Utilities, API client, categories
├── docs/                 # Architecture, API reference, feature specs
├── deploy/               # Nginx config for production
├── docker-compose.yml    # Dev infrastructure (PostgreSQL + Redis)
└── docker-compose.prod.yml
```

- [Architecture](docs/ARCHITECTURE.md) — System design and decisions
- [API Reference](docs/API.md) — Full REST API documentation
- [Features](docs/FEATURES.md) — Feature specifications and history

## Links

- [Privacy Policy](https://navisha.app/privacy)
- [Terms of Service](https://navisha.app/terms)
- [Contact](https://navisha.app/contact)

## License

MIT © 2025–2026 Navisha

---

## Roadmap

- [x] Project planning & architecture design
- [x] Backend: Project scaffold (domain structure, config, DB/Redis, server)
- [x] Backend: Auth (Google OAuth + JWT, tested end-to-end)
- [ ] Backend: Trip, Itinerary, Budget APIs
- [ ] Frontend: Auth flow
- [ ] Frontend: Trip dashboard & itinerary builder
- [ ] Frontend: Map view
- [ ] Frontend: Budget tracker
- [ ] Frontend: Currency converter

---

## Contributing

Contributions are welcome! Please open an issue first to discuss what you'd like to change.

1. Fork the repo
2. Create a feature branch (`git checkout -b feat/your-feature`)
3. Commit your changes
4. Open a pull request

---

## License

[MIT](LICENSE)
