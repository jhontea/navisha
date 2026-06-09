# Backend — Claude Context

## Stack
Go, Echo framework, PostgreSQL 16, Redis 7, JWT (httpOnly cookie), Google OAuth, Viper (config)

## Project Structure
```
backend/
├── cmd/server/           # main.go — wire dependencies, start server
├── internal/
│   ├── user/             # domain: model.go, repository.go, usecase.go, handler.go
│   ├── trip/             # domain: model.go, repository.go, usecase.go, handler.go
│   ├── expense/          # domain: model.go, repository.go, usecase.go, handler.go
│   ├── currency/         # domain: model.go, repository.go, usecase.go, handler.go
│   ├── apperr/           # shared sentinel errors (ErrNotFound, ErrUnauthorized, etc.)
│   └── middleware/       # JWT auth, CORS — cross-cutting, not domain-specific
├── pkg/
│   ├── jwt/              # token generation/validation
│   ├── oauth/            # Google OAuth helpers
│   └── currency/         # Frankfurter API HTTP client
├── migrations/           # numbered SQL files (001_init.sql, 002_xxx.sql)
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

### Dependency Injection
- No global state
- Constructor pattern: `func NewUsecase(repo Repository) *Usecase`
- Wire everything in `cmd/server/main.go`

### DB
- `pgx` driver with `pgxpool` for connection pooling
- Raw SQL — no ORM
- Migrations run on startup via `AUTO_MIGRATE=true` in env

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
  supported: [IDR, USD, JPY, SGD, KRW]
  cache_ttl: 3600
jwt:
  access_ttl: 900      # 15 minutes
  refresh_ttl: 604800  # 7 days
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
```

**Priority**: env vars override config.yaml (Viper handles this automatically).

## Supported Currencies
`IDR`, `USD`, `JPY`, `SGD`, `KRW` — defined in `config.yaml`, loaded into `currency.SupportedCurrencies` at startup.

Exchange rates fetched from Frankfurter API, cached in Redis key `rates:{base}` with TTL from config.
