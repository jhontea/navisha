# Backend — Claude Context

## Stack
Go 1.27, Echo framework, PostgreSQL 16+, Redis 7+, JWT (httpOnly cookie), Google OAuth, Viper (config), DeepSeek/OpenRouter LLM

## Project Structure
```
backend/
├── cmd/server/           # main.go (config, DB, Redis, migrations, start/shutdown), wire.go (domains), routes.go (Echo, middleware, routes)
├── cmd/summarypreview/   # print the AI summary for one trip without saving (prompt work)
├── cmd/autogeneval/      # generate sample trips + geocode them, print quality numbers (prompt/model work)
├── cmd/migrate/          # standalone migration CLI (`-status` lists pending)
├── internal/
│   ├── accommodation/    # domain: accommodation CRUD + linked expense
│   ├── activity/         # domain: polymorphic activities (location | note | todo)
│   ├── apperr/           # shared sentinel errors (ErrNotFound, ErrUnauthorized, etc.)
│   ├── autogen/          # domain: AI trip generation (LLM prompt → draft → persist)
│   ├── currency/         # domain: rates / convert / supported; Redis-cached CurrencyFreaks USD map
│   ├── expense/          # domain: CRUD + summary, auto-convert via currency.Usecase (Converter interface)
│   ├── integration/      # cross-domain data assembly adapters (summary aggregator, autogen creator)
│   ├── location/         # Geoapify autocomplete proxy + Google Maps link helpers
│   ├── middleware/       # JWT auth, CORS, rate limit, timeout, body limit — cross-cutting
│   ├── migrate/          # SQL migration runner (runs on every server start)
│   ├── quota/            # shared daily AI quota per user (app_settings.autogen_daily_quota)
│   ├── summary/          # domain: AI trip summary generation (LLM → markdown → cache)
│   ├── transportation/   # domain: transportation CRUD + linked expense
│   ├── trip/             # domain: trip + day CRUD, date regeneration, budget PATCH semantics
│   ├── tripshare/        # domain: public read-only share links
│   └── user/             # domain: Google OAuth login, JWT refresh, logout, email whitelist
├── pkg/
│   ├── currency/         # CurrencyFreaks API HTTP client
│   ├── dbtx/             # WithTx: begin → fn → commit, rollback on error or panic
│   ├── jwt/              # token generation/validation
│   ├── llm/              # Multi-provider LLM client (DeepSeek + OpenRouter, OpenAI-compatible)
│   ├── oauth/            # Google OAuth helpers (OAuth2 config, user info fetch)
│   └── sanitize/         # strip HTML from user-provided text
├── migrations/           # numbered SQL files (001_init.sql through 020_harden_auth_sessions.sql)
├── config/               # typed config struct + Viper loader
├── config.yaml           # base config (non-secret, git-tracked)
└── .env                  # secrets (not committed — see .env.example)
```

## Domain Structure
Each domain package (user/, trip/, expense/, currency/) contains:
- `model.go` — structs and constants
- `repository.go` — Repository interface + domain-specific errors
- `usecase.go` — business logic (added as features are built)
- `handler.go` — Echo HTTP handlers (added as features are built)

Cross-domain shared errors live in `apperr/`. Cross-domain references use string IDs (e.g. `expense.Expense.TripID string`) — no cross-imports between domain packages.

## Conventions

### Error Handling
- Always wrap errors: `fmt.Errorf("trip.usecase.Create: %w", err)`
- Domain errors defined in each domain's `repository.go` (e.g. `trip.ErrNotFound`)
- Shared sentinel errors in `apperr/` (e.g. `apperr.ErrUnauthorized`)
- Handlers map domain errors to HTTP status codes

### Handlers
- Authenticated handlers take the user ID as a parameter: `func (h *Handler) List(c echo.Context, userID string) error`, registered as `middleware.WithUser(h.List)` behind the auth middleware (401 when it is missing).

### Transactions
- Use `dbtx.WithTx(ctx, u.repo, func(tx pgx.Tx) error { ... })`; repositories that need multi-statement writes expose `BeginTx` / `Commit` / `Rollback`.

### Dependency Injection
- No global state
- Constructor pattern: `func NewUsecase(repo Repository) *Usecase`
- Wire domains in `cmd/server/wire.go`; middleware and routes in `cmd/server/routes.go`

### DB
- `pgx` driver with `pgxpool` for connection pooling
- Raw SQL — no ORM
- Migrations run on **every** server start (no flag). A local `.env` pointing at the production DB will migrate production.

### Activity Payload
- `payload` column is JSONB in DB
- Go type: `json.RawMessage` in `Activity` struct
- Validate payload shape in usecase layer based on `Type` field

### Auth
- JWT stored in httpOnly cookie (`access_token`, `refresh_token`)
- `middleware.Auth` extracts user ID from JWT and sets in Echo context via `middleware.UserIDKey`
- Refresh logic handled on 401 response

## Config Strategy

**config.yaml** — base non-secret config, committed to git:
```yaml
server:
  port: 8090
db:
  pool_size: 10
currency:
  supported: [IDR, USD, JPY, SGD, KRW, MYR, THB, EUR, VND]
  cache_ttl: 3600
jwt:
  access_ttl: 1800     # 30 minutes
  refresh_ttl: 604800  # 7 days
llm:
  provider: ""          # deepseek or openrouter
  deepseek_model: deepseek-flash
  openrouter_model: openrouter/owl-alpha
  timeout_seconds: 300
```

**.env** — secrets, never committed:
```
DATABASE_URL=postgres://navisha:navisha@localhost:5439/navisha
REDIS_URL=redis://localhost:6389
JWT_SECRET=
JWT_REFRESH_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URL=http://localhost:8090/api/v1/auth/google/callback
FRONTEND_URL=http://localhost:3000
CURRENCYFREAKS_API_KEY=
SHARE_LINK_SECRET=      # must differ from the JWT secrets
GEOAPIFY_API_KEY=
DEEPSEEK_API_KEY=       # or OPENROUTER_API_KEY
```

See `.env.example` for the full list.

**Priority**: env vars override config.yaml (Viper handles this automatically).

## Supported Currencies
`IDR`, `USD`, `JPY`, `SGD`, `KRW`, `MYR`, `THB`, `EUR`, `VND` — defined in `config.yaml`, loaded into `currency.SupportedCurrencies` at startup.

Exchange rates fetched from CurrencyFreaks API (USD-based). Full USD-keyed map cached in Redis key `rates:USD` with TTL from config; cross-rates `base→target = rates[target]/rates[base]` derived in `internal/currency/rate_math.go`.

## LLM Provider
Multi-provider LLM client (`pkg/llm/`) supports DeepSeek and OpenRouter via config-driven selection. Auto-downgrades `json_schema` strict → `json_object` for DeepSeek with schema injected into system prompt. Config via `LLM_PROVIDER`, `DEEPSEEK_API_KEY`, `DEEPSEEK_MODEL` env vars. Falls back to legacy OpenRouter when `LLM_PROVIDER` is empty.

## Cross-Domain Pattern
Domains communicate via **local interfaces** (not cross-imports):
- `expense.Converter` interface → satisfied by `*currency.Usecase` — auto-convert expenses to trip base
- `expense.LinkedExpenseCreator` interface → satisfied by `*expense.Usecase` — `SyncLinkedExpenseTx` creates, updates or removes a booking's cost expense (`expenses.transportation_id` / `accommodation_id`) inside the transport/accommodation tx
- `summary.DataProvider` / `autogen.TripCreator` interfaces → satisfied by `*integration.Adapter` — cross-domain data assembly
- `trip.Handler.SetOnDelete(fn)` — fire-and-forget delete hook (generic, reusable)

## Checks
- `go build ./... && go vet ./... && go test ./...`
- `golangci-lint run ./...` (config in `.golangci.yml`). CI fails only on **new** findings. The baseline is clean (on Windows, CRLF checkouts can show false gofmt hits).
