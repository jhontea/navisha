# F5 — Auto-Generate Trip dari Prompt (OpenRouter)

Task breakdown untuk fitur **Auto-Generate Trip**. Sumber rencana: `docs/PLAN_PHASE2.md` bagian F5 + P1 (OpenRouter client, sudah ada).

## Tujuan

User mengisi **form singkat** (mau kemana, deskripsi perjalanan, rentang tanggal). Backend memanggil OpenRouter dengan **JSON schema response format** untuk menghasilkan draft itinerary terstruktur. User melihat preview, lalu klik "Buat Trip" untuk menyimpan trip + days + activities.

> Keputusan scope (hasil diskusi):
> - **Input berbentuk chat wizard** (revisi dari form biasa): bot menanyakan langkah demi langkah — (1) Mau ke mana? → (2) Ceritakan tujuannya (opsional) → (3) Dari kapan sampai kapan? → (4) Mata uang → (5) Review + Generate. Tiap jawaban tampil sebagai bubble. Komponen: `frontend/src/features/trip/components/GenerateChatWizard.tsx`. Batasan tetap sama (destinasi max 60 char, deskripsi max 100 char, range ≤ 10 hari).
> - **Loading state**: animasi sparkle + rotating message ("This can take a little while — hang tight ✨", dll), bukan teks statis durasi.
> - **Prompt diperketat**: setiap hari wajib minimal 2 aktivitas lokasi, dilarang mengembalikan field kosong (mencegah bug "aktivitas kosong"). Respons LLM mentah di-log di backend untuk debugging.

> - **Maksimum 10 hari** per generate (cap di handler + prompt + validasi hasil) agar AI cepat & biaya terbatas.
> - **JSON schema response format** dipakai untuk output terstruktur yang mudah di-parse.
> - **Proses Sync** (blocking request) untuk MVP — frontend tampilkan loading state jelas (~10-25 detik). Async/job-queue di-defer ke nanti (Redis sudah tersedia bila perlu).
> - **Persist single-shot** via `POST /trips/from-draft` (atomik) — lebih reliable daripada orkestrasi multi-call di frontend.
> - **Scope aktivitas**: generate activity tipe `location` + `note` per hari (transport & accommodation di-skip untuk MVP).

## Strategi Anti-Abuse (input asal / prompt injection)

Defense in depth, 4 lapis:
1. **Bentuk input terbatas** — form dengan max-length + date picker (bukan textarea bebas).
2. **Validasi backend** — tolak field kosong, terlalu panjang, atau garbage (regex: minimal mengandung huruf). Range tanggal ≤ 10 hari.
3. **Prompt + JSON schema guard** — system message tegas ("HANYA buat itinerary; kalau input bukan permintaan perjalanan valid, JANGAN mengarang"). Schema punya field `ok` + `reason`; bila `ok: false`, backend balas 422 tanpa membuat draft. Ini juga menahan prompt-injection karena model hanya diarahkan keluarkan struktur trip.
4. **Hard cap backend** — max input length, max 10 hari, max N aktivitas/hari (6) — membatasi biaya & durasi walau model kebablasan.

---

## CHUNK 1 — F5-0: OpenRouter JSON Schema Support

Extend `pkg/openrouter` agar mendukung structured output (`response_format: json_schema`).

**Unit Kerja**
- `pkg/openrouter/client.go` — tambah tipe `ResponseFormat { Type, JSONSchema }` + `JSONSchema { Name, Strict, Schema }`. Tambah field `ResponseFormat *ResponseFormat` di `ChatRequest`. Sertakan di payload bila non-nil.
- `pkg/openrouter/client_test.go` — test bahwa `response_format` ikut terkirim di request body.

**Acceptance**
- [x] `go test ./pkg/openrouter/...` hijau.
- [x] Request tanpa `ResponseFormat` tetap kompatibel (omitempty).


---

## CHUNK 2 — F5-A + F5-B: Draft Schema + Prompt/Validator (`internal/autogen/`)

Package baru `internal/autogen/` (pure, unit-testable tanpa LLM).

**Unit Kerja**
- `model.go` — `GenerateInput { Destination, Description, StartDate, EndDate, BaseCurrency }`, `TripDraft { Title, Description, BaseCurrency, Budget, Days []DayDraft }`, `DayDraft { DayNumber, Date, Activities []ActivityDraft }`, `ActivityDraft { Type, Title, StartTime, EndTime, LocationName, *Lat, *Lng, Notes }`. Plus `llmResponse { OK, Reason, Trip }` untuk parsing guard.
- `prompt.go` — `BuildPrompt(GenerateInput) (system, user string)` + `JSONSchema() any` (definisi schema OpenRouter). Cap 10 hari & max aktivitas/hari di instruksi.
- `validate.go` — `ValidateInput(GenerateInput) error` (anti-garbage, range ≤ 10 hari), `ParseAndValidate(raw string) (*TripDraft, error)` (strip fence kalau ada, unmarshal, cek `ok`, validasi struktur draft).
- `*_test.go` — unit test prompt + validator + parser.

**Acceptance**
- [x] `ValidateInput` tolak garbage / range > 10 hari.
- [x] `ParseAndValidate` tangani `ok: false` → error `ErrInvalidPrompt`.
- [x] `go test ./internal/autogen/...` hijau.


---

## CHUNK 3 — F5-C + F5-D: Usecase GenerateDraft + CreateFromDraft

**Unit Kerja**
- `internal/autogen/usecase.go`:
  - `GenerateDraft(ctx, userID, GenerateInput) (*TripDraft, error)` — validasi input → call OpenRouter (json_schema) → parse/validate → return draft (TIDAK persist).
  - `CreateFromDraft(ctx, userID, TripDraft) (tripID string, err error)` — persist via interface `TripCreator` (trip + days + activities). Reuse usecase trip & activity lewat adapter di `internal/integration`.
- `internal/integration/autogen_creator.go` — adapter implement `TripCreator`: panggil `tripUsecase.Create` (auto-generate days), `tripUsecase.Get` (ambil day IDs), lalu `activityUsecase.Create` per aktivitas (match by day_number).
- `LLMClient` interface (subset OpenRouter) + `model` injeksi via constructor (pola sama `summary`).

**Acceptance**
- [x] `GenerateDraft` tidak menyimpan apa pun ke DB.
- [x] `CreateFromDraft` membuat trip + days + activities; days dari rentang tanggal.
- [x] LLM gagal → `ErrLLMUnavailable`; prompt invalid → `ErrInvalidPrompt`.


---

## CHUNK 4 — F5-E: Handler + Routes

**Unit Kerja**
- `internal/autogen/handler.go`:
  - `POST /api/v1/trips/generate` — body `{ destination, description, start_date, end_date, base_currency }` → return `TripDraft` (200).
  - `POST /api/v1/trips/from-draft` — body `TripDraft` → return `{ trip_id }` (201).
  - Error mapping: input/guard invalid → 422; LLM down → 503; lainnya → 500.
- Wire di `cmd/server/main.go`.

**Acceptance**
- [x] Endpoint terdaftar + auth middleware.
- [x] `go build ./...` + `go test ./...` hijau.


---

## CHUNK 5 — F5-F: Frontend

**Unit Kerja**
- `frontend/src/features/trip/types.ts` — mirror `TripDraft`, `GenerateInput`.
- `frontend/src/features/trip/api.ts` — `generateDraft(input)`, `createFromDraft(draft)`.
- `frontend/src/features/trip/hooks/useTrips.ts` — `useGenerateTripDraft()`, `useCreateTripFromDraft()`.
- `frontend/src/app/(dashboard)/trips/generate/page.tsx` — form (destination, description 100 char, date range, currency) → loading state ("Membuat itinerary, ~10-25 detik") → preview draft → tombol "Buat Trip".
- Entry point: tombol "Generate with AI" di dashboard / trips list.

**Acceptance**
- [x] Form submit → loading → preview draft.
- [x] "Buat Trip" → trip tersimpan → redirect ke overview.
- [x] Input invalid (422) → pesan ramah, tidak ada trip dibuat.
- [x] LLM down (503) → pesan "coba lagi".
- [x] `npm run build` sukses.


---

## Status

- CHUNK 1 (F5-0): **selesai** — `response_format` json_schema dikirim bila non-nil, omitempty saat nil. Test hijau.
- CHUNK 2 (F5-A/B): **selesai** — `internal/autogen` (model/prompt/validate) + test hijau. Validasi input (anti-garbage, ≤10 hari), parser dengan ok-guard + sanitasi draft.
- CHUNK 3 (F5-C/D): **selesai** — `autogen.Usecase` (`GenerateDraft` tanpa persist, `CreateFromDraft`) + adapter `integration/autogen_creator.go` (reuse `trip.Create` + `activity.Create`).
- CHUNK 4 (F5-E): **selesai** — handler `POST /trips/generate` + `POST /trips/from-draft`, error mapping 422/503, wired di `main.go`. `go build ./...` + `go test ./...` hijau.
- CHUNK 5 (F5-F): **selesai** — types/api/hooks, `DraftPreview.tsx`, halaman `/trips/generate` (form → loading → preview → Buat Trip), tombol "Generate with AI" di halaman Trips. `npm run build` sukses.

## Verifikasi

- Backend: `go build ./...` clean, `go test ./...` semua paket hijau (termasuk `internal/autogen`, `pkg/openrouter`).
- Frontend: `npm run build` sukses; route `/trips/generate` ter-compile.
- Smoke test end-to-end (klik Generate → AI balas → preview → Buat Trip) perlu dijalankan manual dengan `OPENROUTER_API_KEY` terisi.

## Catatan / Keterbatasan

- Proses Sync: bila model lambat, request menunggu (timeout client OpenRouter 120s, configurable via `openrouter.timeout_seconds`). Upgrade ke async/job-queue bisa menyusul bila perlu.
- **VPS/nginx timeout:** Generate 8 hari bisa makan ~2 menit. Default nginx `proxy_read_timeout` 60s akan memutus koneksi → user lihat error padahal backend masih jalan. `deploy/nginx/navisha.conf` punya location khusus `^/api/v1/trips/(generate|from-draft)$` dengan `proxy_read_timeout 300s`. Nilai ini harus `>= openrouter.timeout_seconds`. Setelah ubah config nginx: `sudo nginx -t && sudo systemctl reload nginx`.
- `CreateFromDraft`: trip + days dibuat atomik (`trip.Create`), activities ditambah per-day setelahnya (bukan satu transaksi tunggal). Bila gagal di tengah, trip tetap konsisten dengan sebagian aktivitas — user bisa edit. Cukup untuk MVP.
- Preview saat ini read-only; edit dilakukan setelah trip dibuat (via halaman trip). Editable preview bisa ditambah nanti.
- Validasi `location_name` via Google Places (anti-halusinasi) di-defer; untuk sekarang lokasi tanpa nama jatuh balik ke title.
- **Koordinat (resolusi di frontend):** LLM tidak dipercaya untuk lat/lng/address/place_id (di-strip di `ParseAndValidate`, backend tidak melakukan geocoding). Saat user klik "Buat Trip", frontend menjalankan `resolveDraftLocations` (`frontend/src/features/trip/lib/resolveDraftLocations.ts`) yang mereplika flow manual `LocationAutocomplete`:
  1. `AutocompleteService.getPlacePredictions({ input: locationName })` → ambil prediksi pertama
  2. `PlacesService.getDetails({ placeId, fields: ["name","formatted_address","geometry","place_id"] })` → ambil detail lengkap
  3. Isi `location_name`, `address`, `lat`, `lng`, `google_place_id` ke draft activity
  Semua lookup jalan **paralel** (`Promise.allSettled`). Halaman `/trips/generate` di-wrap `APIProvider libraries={["places"]}` agar library Places ter-load; tombol menampilkan state "Menyiapkan lokasi…" selama resolusi sebelum "Menyimpan…". Best-effort: kalau Places tidak tersedia / tidak ada hasil, aktivitas tetap tanpa koordinat dan `TripMap` men-geocode-nya client-side sebagai fallback. Koordinat + address + place_id hasil resolusi dikirim ke `POST /trips/from-draft` sehingga langsung tersimpan saat trip dibuat.


