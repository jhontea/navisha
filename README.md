# Navisha

> Plan your journey. Own your adventure.

Navisha is an open-source travel itinerary app that helps you plan trips day by day, visualize routes on a map, and track your travel budget with multi-currency support.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Status](https://img.shields.io/badge/status-in%20development-yellow.svg)

---

## Features

- **Itinerary Builder** — Plan each day of your trip with activities. Each activity can be a location (with map pin), a note, or a to-do checklist.
- **Map View** — Visualize your daily route on Google Maps. See all activity locations in order for each day.
- **Transportation & Accommodation** — Log flights, buses, trains, ferries, and hotel bookings at the trip level.
- **Budget Tracker** — Track expenses per trip with automatic currency conversion to your base currency.
- **Currency Converter** — Quick standalone tool to convert between IDR, USD, JPY, SGD, and KRW using live ECB rates.
- **Google Sign-In** — Simple, secure authentication. No passwords to manage.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Go, Echo, PostgreSQL 16, Redis 7 |
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui |
| Maps | Google Maps JS API + Places API |
| Currency | Frankfurter API (ECB data, free, no key) |
| Auth | Google OAuth 2.0 + JWT (httpOnly cookie) |
| Infra (dev) | Docker Compose |

---

## Getting Started

### Prerequisites

- Go 1.22+
- Node.js 20+
- Docker & Docker Compose
- Google Cloud project with Maps JS API + OAuth credentials

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
# Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
```

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
├── backend/          # Go API server (Echo, Clean Architecture)
├── frontend/         # Next.js web app
├── docs/             # Architecture, API reference, feature specs
└── docker-compose.yml
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for system design and decisions.

See [docs/API.md](docs/API.md) for full API reference.

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
- [ ] Mobile (React Native)

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