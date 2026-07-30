# Navisha — Backend

Go API server for the Navisha travel itinerary app. Echo framework, Clean Architecture, PostgreSQL 16, Redis 7.

## Quick Start

```bash
# Start infrastructure
docker-compose up -d                    # from repo root

# Configure
cp .env.example .env                    # fill in secrets
# Ensure config.yaml has correct DB/Redis ports

# Run
go run ./cmd/server                     # → http://localhost:8090
```

## Architecture

- **Clean Architecture** — `domain → usecase → repository → handler`, each domain in `internal/<name>/`
- **No ORM** — raw SQL via `pgx` driver with `pgxpool` connection pooling
- **Dependency Injection** — constructor pattern, wired in `cmd/server/main.go`, zero global state
- **Cross-domain via interfaces** — domains define local interfaces satisfied by other domains' usecases (no cross-imports)
- **Migration-driven schema** — numbered SQL files in `migrations/`, auto-run on startup with `AUTO_MIGRATE=true`

### Domain Map

| Domain | Package | Responsibility |
|--------|---------|---------------|
| Auth | `internal/user/` | Google OAuth, JWT tokens, email whitelist |
| Trips | `internal/trip/` | Trip + day CRUD, date regeneration, budget PATCH |
| Activities | `internal/activity/` | Polymorphic CRUD (location/note/todo) + reorder |
| Transport | `internal/transportation/` | Transport CRUD + atomic linked expense |
| Stays | `internal/accommodation/` | Accommodation CRUD + atomic linked expense |
| Budget | `internal/expense/` | Expense CRUD + summary + auto currency convert |
| Currency | `internal/currency/` | Rates/convert/supported, Redis-cached CurrencyFreaks |
| AI Summary | `internal/summary/` | LLM trip summary generation, markdown output |
| AI Generate | `internal/autogen/` | LLM trip draft generation, prompt→draft→persist |
| Integration | `internal/integration/` | Cross-domain data adapters (no business logic) |
| Errors | `internal/apperr/` | Shared sentinel errors |
| Auth MW | `internal/middleware/` | JWT auth middleware, CORS |

### API Layers

```
HTTP Request → Handler (Echo) → Usecase (business logic) → Repository (DB/Redis)
                                    ↑
                              Interfaces (DI)
```

## Key Commands

```bash
go run ./cmd/server           # Development server
go build ./...                # Compile check
go test ./...                 # Run all unit tests (CI-safe, no infra required)
go test ./internal/<pkg>/...  # Run specific domain tests
go test -v -run TestName ./... # Run specific test

# Integration tests require a running server + DB + Redis.
# They are excluded from go test ./... by default (build tag: integration).
go test -tags integration ./tests/integration/... -v -count=1 -timeout=300s
```

## Configuration

- **`config.yaml`** — base config (non-secret, committed)
- **`.env`** — secrets (not committed, see `.env.example`)
- Viper merges: env vars override config.yaml values

Production must set `APP_ENV=production`. Startup then fails closed unless
`JWT_SECRET`, `JWT_REFRESH_SECRET`, and `SHARE_LINK_SECRET` are distinct,
non-placeholder values of at least 32 characters, `FRONTEND_URL` uses HTTPS,
and `COOKIE_DOMAIN` is configured for the shared CSRF cookie. Set
`TRUST_PROXY=true` only when the service is behind a trusted reverse proxy;
otherwise client IPs are read directly from the connection.

Refresh tokens are single-use and backed by `refresh_sessions`. Deployments
apply migration `020_harden_auth_sessions.sql` automatically at startup.
Existing refresh tokens issued before this migration do not contain a session
ID, so users may need to sign in once after deployment.

## Supported Currencies

IDR, USD, JPY, SGD, KRW, MYR, THB, EUR, VND

Exchange rates from CurrencyFreaks API (USD-anchored), cached in Redis.

## Related Docs

- Root project: [`../README.md`](../README.md)
- Agent context: [`./CLAUDE.md`](./CLAUDE.md)
- Deploy guide: [`../DEPLOY.md`](../DEPLOY.md)
