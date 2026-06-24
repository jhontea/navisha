## Keputusan desain (final, revisi)

- __Penyimpanan__: tabel baru `trip_summaries`, `UNIQUE(trip_id)` (1 summary/trip, regenerate = UPSERT).
- __Rate-limit__: soft window 5 menit via `updated_at` di tabel itu.
- __LLM__: OpenRouter, model `openrouter/owl-alpha`, key dari env.
- __Context__: dirakit dari 5 domain lewat adapter `internal/integration/`.
- __UI__: `TripSummaryCard` di bawah Hero Section; empty-state menonjol sebagai main focus.

## Breakdown Task

### P1 — OpenRouter client (prasyarat)

1. `pkg/openrouter/client.go` — `Client`, `NewClient(apiKey, model)`, `ChatCompletion(ctx, ChatRequest) (string, error)`. Pola `currencyfreaks.go`: baseURL `https://openrouter.ai/api/v1`, POST `/chat/completions`, header `Authorization: Bearer`. Tipe `Message{Role,Content}`, `ChatRequest{Model,Messages}`.
2. `pkg/openrouter/client_test.go` — `httptest.Server`: happy path, non-200, key kosong.
3. Config: `OpenRouterConfig{APIKey, Model, BaseURL}` + field `OpenRouter` + env binding `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`.
4. `.env.example` + `config.yaml` section openrouter.

### F1 Backend — Domain summary + storage

5. `migrations/007_add_trip_summaries.sql` — `CREATE TABLE trip_summaries(id, trip_id FK CASCADE, content TEXT, model TEXT, created_at, updated_at, UNIQUE(trip_id))`.

6. `internal/summary/`:

   - `model.go` — `Summary{ID,TripID,Content,Model,CreatedAt,UpdatedAt}` + `TripContext{...}`.
   - `repository.go`+`repository_pg.go` — `Save(tripID,content,model)` (UPSERT `ON CONFLICT(trip_id)`), `GetByTripID(tripID)`, `Delete(tripID)`.
   - `prompt.go` — `BuildPrompt(TripContext)(system,user string)` + hard cap token. Unit-testable.
   - `usecase.go` — interface `TripDataProvider{GetTripContext}` + ownership. `Generate(ctx,userID,tripID)`: ownership → rate-limit 5 menit dari `GetByTripID.UpdatedAt` → build context → OpenRouter → `Save`. Plus `Get`,`Delete`. Error `ErrRateLimited`,`ErrForbidden`,`ErrNotFound`.
   - `usecase_test.go`+`prompt_test.go` — mock provider/LLM/repo.

### F1 Backend — Adapter, handler, wiring

7. `internal/integration/trip_context.go` — adapter implement `summary.TripDataProvider` + ownership via trip usecase. Import 5 usecase, map ke `TripContext`.
8. `internal/summary/handler.go` — `POST/GET/DELETE /api/v1/trips/:id/summary`. `ErrRateLimited`→429 `{code:"RATE_LIMITED",retry_after_seconds}`, forbidden→403, GET not-found→404.
9. `cmd/server/main.go` — wire `openrouterClient`, `summaryRepo`, `provider`, `summaryUsecase`, routes.

### F1 Frontend

10. `features/trip/types.ts` — `TripSummary{content,model,created_at,updated_at}`.
11. `features/trip/api.ts` — `tripApi.summary = {generate, get, delete}` (GET terpisah, tidak ikut `useTrip`).
12. `useTrips.ts` — `useTripSummary(tripId)` (handle 404=belum ada), `useGenerateSummary`, `useDeleteSummary`.
13. `components/TripSummaryCard.tsx` — empty/loading/loaded, render markdown (`react-markdown`), Regenerate + countdown dari `updated_at`.
14. `overview/page.tsx` — sisipkan `<TripSummaryCard>` setelah Hero Section (≈ baris 682).
15. Install `react-markdown`.

### Docs

16. `docs/API.md` (3 endpoint) + `docs/FEATURES.md`.

## Catatan

- Beda dari Opsi A: ada repository + GET endpoint terpisah, summary di-fetch sendiri. Domain lebih bersih + kolom `model` untuk tracking.
- __Urutan__: P1 dulu, baru F1. `pkg/openrouter/` belum ada.
- __Keamanan__: key di `.env` (gitignored); saran kuat __revoke key itu setelah dev__ karena sudah terekspos di chat.

Kalau sudah pas, __toggle ke Act mode__ dan aku mulai dari P1 lalu F1.
