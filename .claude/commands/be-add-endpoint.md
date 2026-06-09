# /be-add-endpoint

Scaffold a new API endpoint following Navisha's Clean Architecture pattern.

**Usage**: `/be-add-endpoint <feature> <method> <path>`

Example: `/be-add-endpoint trip POST /trips`

## Steps

1. **Read context first**: Check `backend/CLAUDE.md` and `docs/API.md` for conventions and the endpoint contract.

2. **Domain layer** (`backend/internal/domain/`):
   - Add or update the entity struct if needed
   - Add the repository interface method if it requires DB access
   - Add domain error in `errors.go` if a new error case is needed (e.g. `ErrTripNotFound`)

3. **Repository layer** (`backend/internal/repository/`):
   - Implement the repository interface method with raw SQL using `pgx`
   - Wrap errors: `fmt.Errorf("repository.CreateTrip: %w", err)`

4. **Usecase layer** (`backend/internal/usecase/`):
   - Implement business logic
   - Validate inputs, orchestrate repository calls
   - Wrap errors: `fmt.Errorf("usecase.CreateTrip: %w", err)`
   - Map `pgx.ErrNoRows` → domain error (e.g. `domain.ErrTripNotFound`)

5. **Handler layer** (`backend/internal/handler/`):
   - Parse and bind request
   - Call usecase
   - Map domain errors to HTTP status codes
   - Return JSON response matching `docs/API.md` contract

6. **Register route** in `backend/cmd/server/main.go` or the relevant route group file.

7. **Verify**: Check the endpoint against `docs/API.md` — request body, response shape, and error codes must match.
