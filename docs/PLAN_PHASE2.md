# Phase 2 — Feature Plan

Rencana implementasi 5 fitur Phase 2. Memecah setiap fitur menjadi unit kerja independen agar bisa dikerjakan tuntas secara bertahap dan mengurangi kompleksitas.

## Daftar Fitur

| #  | Fitur                                      | Kompleksitas | Prasyarat |
|----|--------------------------------------------|--------------|-----------|
| F1 | Generate trip summary (OpenRouter)         | Sedang       | P1        |
| F2 | Open in Google Maps                        | Rendah       | —         |
| F3 | Export to Google Maps bookmark (Saved Places) | Tinggi    | — (KML)  |
| F4 | Export to Google Calendar + remove on delete | Tinggi     | P2        |
| F5 | Auto-generate trip dari prompt (OpenRouter) ✅ | Tinggi   | P1        |


---

## Prasyarat Bersama

### P1 — OpenRouter Client Package

**Tujuan:** HTTP client reusable untuk OpenRouter Chat Completions API. Dipakai F1 + F5.

**Pola:** Sama persis dengan `backend/pkg/currency/currencyfreaks.go` (sudah ada, jadikan referensi — base URL const, API key lewat constructor, `http.Client` dengan timeout, `http.NewRequestWithContext`, decode JSON response, wrap error dengan context).

**Files:**
- `backend/pkg/openrouter/client.go` — `Client`, `NewClient(apiKey)`, method `ChatCompletion(ctx, ChatRequest) (string, error)`. Tipe pendukung: `Message { Role, Content }`, `ChatRequest { Model, Messages, ResponseFormat }`, `ResponseFormat { Type, JSONSchema }`.
- `backend/pkg/openrouter/client_test.go` — `httptest.Server` untuk mock, uji happy path + non-200 status + API key kosong.

**Config:**
- `backend/config/config.go` — tambah struct `OpenRouterConfig { APIKey, Model, BaseURL }` (mapstructure tags: `api_key`, `model`, `base_url`). Tambah field `OpenRouter OpenRouterConfig` di `Config`.
- Loop env binding di `config.go:81` — tambah `"openrouter.api_key": "OPENROUTER_API_KEY"`.
- `backend/.env.example` — tambah `OPENROUTER_API_KEY=`.
- `backend/config.yaml` — tambah section `openrouter: { model: openai/gpt-4o-mini }`.

**Wiring:**
- `backend/cmd/server/main.go:91` — buat instance `openrouterClient := openrouter.NewClient(cfg.OpenRouter.APIKey)` sebelum digunakan usecase.

**Acceptance:**
- `go test ./pkg/openrouter/...` hijau.
- Client di-inject lewat constructor (no global state, sesuai `backend/CLAUDE.md`).

---

### P2 — Google OAuth Scopes + Refresh Token Storage

**Tujuan:** Memperluas OAuth flow untuk minta scope Calendar + menyimpan refresh token user. Dipakai F4. F3 (KML) tidak butuh ini.

**Saat ini (blocker):** `pkg/oauth/google.go:22` hanya minta `[openid, email, profile]`. Model `user.User` (`internal/user/model.go:5`) **tidak menyimpan token Google sama sekali** — hanya `google_id`, `email`, `name`, `avatar_url`. Backend tidak bisa panggil Google API atas nama user.

**Files:**
- `backend/pkg/oauth/google.go:22` — tambah scope `https://www.googleapis.com/auth/calendar.events` (F4). Jangan tambah scope Maps Saved Places — tidak ada public write API (lihat F3).
- `backend/migrations/007_add_user_oauth_tokens.sql` — `ALTER TABLE users ADD COLUMN google_refresh_token TEXT; ADD COLUMN google_access_token TEXT; ADD COLUMN google_token_expiry TIMESTAMPTZ; ADD COLUMN google_scopes TEXT[];`.
- `backend/internal/user/model.go` — extend struct `User` dengan 4 field di atas.
- `backend/internal/user/repository.go:7` — tambah method `UpdateGoogleTokens(userID string, token *oauth2.Token, scopes []string) error` di interface + impl repository_pg.
- `backend/internal/user/usecase.go` (di `GoogleLogin`) — setelah `oauth2.Config.Exchange`, panggil `repo.UpdateGoogleTokens`.

**Re-auth flow (penting):**
- Saat user pertama kali klik tombol F4, backend cek refresh token + scope. Kalau tidak cukup, redirect ke `GET /api/v1/auth/google/reauth` yang picu OAuth ulang dengan `access_type=offline` + `prompt=consent`.
- Tambah route reauth di `backend/internal/user/handler.go`.
- `prompt=consent` wajib — tanpa ini Google tidak kasih refresh token baru untuk user yang sudah pernah authorize.

**Acceptance:**
- User lama tetap bisa login (scope baru tidak invalidate session).
- Saat pakai F4 pertama kali, diminta re-auth → `users.google_refresh_token` terisi.
- Backend bisa generate valid access token dari refresh token (test: list Calendar events dummy).

---

## F1 — Generate Trip Summary (OpenRouter)

**Tujuan:** Tombol "Generate AI Summary" di trip overview. Backend kirim seluruh konteks trip ke OpenRouter, response ditampilkan sebagai section collapsible. Tidak butuh OAuth scope tambahan (API key backend-side saja).

### Unit Kerja

**F1-A — Domain package `internal/summary/` (backend, pure)**
- `model.go` — `TripContext` (Title, Destination, StartDate, EndDate, Days, Transportation, Accommodation, TotalBudget, BaseCurrency, TotalSpent), `Summary` (ID, TripID, Content, CreatedAt).
- `repository.go` — interface `Save(tripID, content)`, `GetByTripID(tripID)`.
- `migrations/008_add_trip_summaries.sql` — table `trip_summaries(id, trip_id FK CASCADE, content, created_at, updated_at, UNIQUE(trip_id))`.
- `repository_pg.go` — impl.

**F1-B — Usecase + prompt builder (backend)**
- `usecase.go` — `Generate(ctx, tripID) (*Summary, error)`: build context → render prompt → call `openrouter.Client.ChatCompletion` → persist.
- `prompt.go` — template prompt (system + user message). Pisahkan dari usecase agar bisa di-unit-test tanpa LLM call.

**F1-C — Handler + route (backend)**
- `POST /api/v1/trips/:id/summary` — trigger generate (blocking sync, context timeout 30s dulu — defer async job sampai perlu).
- `GET /api/v1/trips/:id/summary` — cached summary (atau 404).
- `DELETE /api/v1/trips/:id/summary` — hapus (opsional, kalau user mau regenerate fresh).
- Ownership check sama dengan `trip.usecase.Update` (`backend/internal/trip/usecase.go:151`).

**F1-D — Cross-domain data assembly (backend, wiring)**
- **Masalah:** `backend/CLAUDE.md` melarang cross-import antar domain package. Tapi summary butuh data dari trip + activity + transportation + accommodation + expense.
- **Solusi:** Definisikan interface `TripDataProvider` di `internal/summary/usecase.go`. Implementasikan adapter di package baru `backend/internal/integration/trip_context.go` yang import semua domain + memetakan ke `summary.TripContext`. Wire di `cmd/server/main.go`.

**F1-E — Frontend (API + hook + UI)**
- `frontend/src/features/trip/api.ts:35` — tambah `summary: { generate, get, delete }` di objek `tripApi`.
- `frontend/src/features/trip/hooks/useTrips.ts:61` — tambah `useGenerateSummary(tripID)`, `useTripSummary(tripID)`.
- `frontend/src/app/(dashboard)/trips/[id]/overview/page.tsx:506` (header actions) — tombol "AI Summary" dengan icon `auto_awesome`.
- Komponen baru `frontend/src/features/trip/components/TripSummaryCard.tsx` — render markdown (pakai react-markdown atau library sejenis), collapsible, tombol "Regenerate". Tampilkan di bawah hero summary (`overview/page.tsx:548`).

### Acceptance Criteria
- Klik → loading 5-10s → summary muncul.
- Cached: reload page → summary tetap ada tanpa call LLM.
- Regenerate overwrite summary lama.
- Error LLM (quota/rate-limit/network) → toast "Failed to generate, try again".
- Cost-aware: tampilkan char/token count di UI supaya user aware.

---

## F2 — Open in Google Maps

**Tujuan:** Tombol "Open in Google Maps" yang buka tab Google Maps dengan semua lokasi aktivitas + akomodasi sebagai marker. **Pure frontend**, tidak butuh backend baru.

### Pendekatan

Google Maps "directions URL" bisa terima multiple waypoint:
```
https://www.google.com/maps/dir/<lat>,<lng>/<lat>,<lng>/...
```
- Maksimum ~10 waypoint per URL (limit Google Maps). Kalau >10, pakai 10 pertama + toast "Showing first 10 of N".

### Unit Kerja

**F2-A — Frontend (utility + UI)**
- `frontend/src/features/trip/lib/mapsUrl.ts` (file baru) — export `buildMapsDirectionsUrl(points: MapPoint[])`, `buildMapsSearchUrl(query: string)`, interface `MapPoint { lat, lng, label? }`. Urutkan by day + orderIndex, filter yang tidak punya lat/lng, fallback ke search destination kalau kosong.
- `frontend/src/app/(dashboard)/trips/[id]/overview/page.tsx:506` (header actions) — tambah tombol outline "Open in Maps" dengan icon `map`, `onClick={() => window.open(mapsUrl, "_blank")}`.
- **Data source:** Overview page sudah punya `trip.days`. Aggregate semua location-type activities + accommodations di client pakai hooks yang sudah ada (`useActivities(dayId)`, `useAccommodations(tripId)`).

### Acceptance Criteria
- Tombol muncul di overview header.
- Klik → new tab Google Maps dengan marker semua lokasi.
- Trip tanpa lokasi → fallback search destination.
- >10 lokasi → 10 pertama + toast info.

---

## F3 — Export to Google Maps Bookmark (Saved Places)

**Tujuan:** Simpan semua lokasi trip ke akun Google user.

**Blocker teknis:** Google Maps Saved Places **tidak punya public write API**. Yang ada cuma My Maps API (deprecated, terbatas) atau device-only intent.

### Strategi

| Opsi | Cara | Pro | Kontra |
|------|------|-----|--------|
| A (rekomendasi) | KML file export + manual import | Simple, no OAuth, cross-platform | Manual step untuk user |
| B | Google My Maps Enterprise API | Programmatic write | Butuh Workspace verification berminggu-minggu |
| C | Google Maps app deeplink | Native UX | Mobile-only, tidak persist |

**Pilih A** untuk Phase 2.

### Unit Kerja (KML Export)

**F3-A — Backend KML generator (pure)**
- `backend/pkg/kml/kml.go` — `Build(tripTitle string, placemarks []Placemark) ([]byte, error)`, `Placemark { Name, Description, Lat, Lng }`. Pakai `encoding/xml` untuk escape. Folder per day.
- `backend/pkg/kml/kml_test.go` — uji output valid XML (parse ulang).

**F3-B — Backend HTTP handler + assembly**
- Route `GET /api/v1/trips/:id/export/kml` — return `Content-Type: application/vnd.google-earth.kml+xml`, `Content-Disposition: attachment; filename="<trip-title>.kml"`.
- Pakai adapter pattern (sama F1-D) untuk assembly data cross-domain.
- Ownership check trip.

**F3-C — Frontend download trigger + UX**
- `frontend/src/lib/api.ts` — tambah `api.download(path)` yang trigger browser download (response blob, bukan JSON). Implementasi: `fetch` → `res.blob()` → `URL.createObjectURL` → `<a download>` click.
- Tombol di overview header: "Export to Maps" dengan icon `download`.
- Modal instruction setelah download: "How to import to Google My Maps: 1. Buka google.com/maps/d 2. Create new map 3. Import file KML" dengan screenshot.

### Acceptance Criteria
- Klik → file `.kml` ke-download.
- KML valid, bisa di-import ke Google My Maps (cek manual).
- Semua lokasi aktivitas + akomodasi masuk sebagai placemark.
- Folder per hari di My Maps.

### Catatan Scope
Kalau auto-persist wajib, butuh migrasi ke Google Workspace API + verification (berminggu-minggu). Defer ke Phase 3.

---

## F4 — Export to Google Calendar + Remove on Delete

**Tujuan:** Buat event di Google Calendar user untuk transport + accommodation + aktivitas penting. Hapus event kalau trip/item dihapus dari Navisha.

**Butuh:** P2 (refresh token + scope `calendar.events`).

### Mapping Data → Calendar Event

| Navisha entity | Calendar event |
|---------------|----------------|
| Transportation | `departure_datetime` → `arrival_datetime`, summary = `${type} to ${to_location}`, location = `${from_location}` |
| Accommodation | All-day event `check_in` → `check_out` (exclusive end), summary = `Stay: ${name}` |
| Activity (location) | Event di `day.date` dengan `start_time` → `end_time`, location = `${location_name}` |
| Activity (note/todo) | Skip — bukan calendar-worthy |

### Unit Kerja

**F4-A — Google Calendar client package**
- `backend/pkg/googlecalendar/client.go` — thin wrapper di atas `google.golang.org/api/calendar/v3`. `NewFromToken(ctx, *oauth2.Token)`, `CreateEvent`, `DeleteEvent`, `ListEvents`.
- Dependency: `google.golang.org/api/calendar/v3` (lazim di ekosistem Go).

**F4-B — Persist mapping entity → event ID**
- `migrations/009_add_calendar_exports.sql` — table `calendar_exports(id, user_id FK, source_type, source_id, google_event_id, google_calendar_id DEFAULT 'primary', created_at, UNIQUE(source_type, source_id))`.
- Tabel terpisah (bukan kolom di entity) lebih fleksibel: multi-calendar support, audit.

**F4-C — Calendar export domain (`internal/calendar_export/`)**
- `usecase.go` — `ExportTrip(ctx, userID, tripID)`, `ExportEntity(ctx, userID, sourceType, sourceID)`, `RemoveEntity(ctx, sourceType, sourceID)`, `RemoveTrip(ctx, tripID)`.
- Adapter pattern untuk baca data cross-domain (sama F1-D).
- Token refresh: pakai `oauth2.TokenSource` yang auto-refresh dari `users.google_refresh_token`.

**F4-D — Hook ke entity delete (penting!)**
- `backend/internal/trip/usecase.go:210` (`Delete`) — setelah `repo.Delete`, panggil `calendar_export.RemoveTrip(tripID)` via interface.
- `backend/internal/{transportation,accommodation,activity}/usecase.go` (`Delete` method) — panggil `calendar_export.RemoveEntity` setelah entity delete sukses.
- **Penting:** error di cleanup calendar **tidak boleh** membatalkan delete utama. Fire-and-forget dengan log.

**F4-E — HTTP handler**
- `POST /api/v1/trips/:id/calendar-export` — trigger export untuk seluruh trip.
- `DELETE /api/v1/trips/:id/calendar-export` — hapus semua event yang ter-export.
- Error handling: token expired/revoked → 401 dengan body `{ code: "GOOGLE_REAUTH_REQUIRED" }` agar frontend redirect ke re-auth.

**F4-F — Frontend**
- `useTrips.ts` — `useExportTripToCalendar(tripID)`, `useRemoveTripFromCalendar(tripID)`.
- Overview header — tombol "Export to Calendar" (icon `calendar`).
- Modal konfirmasi sebelum export: "This will create N events in your Google Calendar. Continue?".
- Toast success: "N events created" + link `https://calendar.google.com`.
- 401 `GOOGLE_REAUTH_REQUIRED` → toast dengan tombol "Re-authorize" yang redirect ke `/api/v1/auth/google/reauth`.

### Acceptance Criteria
- Export trip → semua transport/accommodation/location muncul di Calendar.
- Delete trip → event terkait hilang dari Calendar.
- Delete satu transport → event-nya hilang dari Calendar.
- Revoke Google access → error jelas, trip data tetap aman, bisa re-auth.
- Idempotent: export kedua kali tidak duplikat (check `calendar_exports` dulu).

### Edge Cases
- Accommodation all-day melewati midnight → pakai `end.date` (exclusive) bukan `end.dateTime`.
- Timezone: departure/arrival disimpan UTC, convert ke timezone destination (butuh field timezone di trips, atau pakai UTC biar simple di MVP).
- Duplicate detection: kalau `calendar_exports` sudah punya mapping, skip create (atau update kalau data beda).

---

## F5 — Auto-Generate Trip dari Prompt (OpenRouter)

**Tujuan:** User kasih prompt NL ("5 days in Tokyo, budget 5 juta IDR, suka anime"), backend panggil OpenRouter untuk generate struktur trip lengkap. User preview, edit, baru save.

**Butuh:** P1 (OpenRouter client). Tidak butuh P2.

### Alur

```
User input prompt (NL)
  → Backend: call OpenRouter dengan JSON schema response_format
  → OpenRouter return structured TripDraft
  → Backend: validate draft
  → Frontend: preview editable
  → User "Create Trip" → persist via existing create endpoints
```

### Unit Kerja

**F5-A — TripDraft schema (backend + frontend)**
- `backend/internal/trip/draft.go` — `TripDraft { Title, Description, StartDate, EndDate, BaseCurrency, Budget, Days []DayDraft }`, `DayDraft { DayNumber, Activities []ActivityDraft }`, `ActivityDraft { Type, Title, StartTime, EndTime, LocationName, *Lat, *Lng, Notes, TodoItems }`.
- `frontend/src/features/trip/types.ts` — mirror `TripDraft` interface.

**F5-B — Prompt + JSON schema**
- `backend/internal/trip/autogen.go` (atau package baru `internal/autogen/`) — `BuildGeneratePrompt(input) (system, user string)`, `JSONSchema() any` untuk OpenRouter structured output.
- System message: role + rules ("you are travel planner", "always return valid JSON matching schema", "currency ISO 4217").
- User message: prompt user + tanggal + budget + preferences.

**F5-C — Usecase `GenerateDraft`**
- `backend/internal/trip/usecase.go` — tambah `GenerateDraft(ctx, input) (*TripDraft, error)`.
- Panggil `openrouterClient.ChatCompletion` dengan `response_format: json_schema`.
- Validate output: dates valid (end >= start), currency supported, activity type valid, location-type wajib punya `location_name`.
- **Tidak persist di tahap ini** — user harus approve dulu.

**F5-D — HTTP handler**
- `POST /api/v1/trips/generate` dengan body `{ prompt, start_date, end_date, base_currency }`.
- Return `TripDraft` (200 OK) atau error. Sync dulu (~10-20s).

**F5-E — Frontend**
- Halaman baru `frontend/src/app/(dashboard)/trips/generate/page.tsx` atau modal di dashboard.
- Form: textarea prompt + date pickers + currency select + submit "Generate".
- Loading state: skeleton + "This can take 10-20 seconds".
- Preview: render TripDraft read-only dengan tombol "Edit" (redirect ke TripForm pre-filled) atau "Create Trip".
- `useTrips.ts` — `useGenerateTripDraft()` mutation.

**F5-F — Persist draft (backend single-shot, rekomendasi)**
- Endpoint baru `POST /trips/from-draft` yang terima `TripDraft` lengkap, simpan trip + days + activities + (opsional) transport/accommodation dalam satu transaction. Lebih atomic + reliable daripada frontend orkestrasi multiple call.

### Acceptance Criteria
- Prompt "5 days in Tokyo, budget 5 juta IDR" → draft valid (5 days, activities per day, budget allocation reasonable).
- Draft bisa di-preview sebelum commit.
- Setelah approve, trip + days + activities ter-create.
- LLM return invalid → error jelas + retry button.
- Cost-aware: tampilkan estimasi token usage di UI.

### Catatan
- **Model selection penting.** `gpt-4o-mini` cukup untuk draft sederhana; model lebih besar lebih baik untuk nuance budget. Bikin configurable lewat `config.yaml`.
- **Prompt engineering** paling banyak iterasi di sini. Test dengan berbagai prompt sebelum production.
- **Hallucination risk:** lokasi yang LLM sebut mungkin tidak real. Validate `location_name` via Google Places API (lookup place_id) sebelum persist. Kalau tidak ketemu → skip atau mark "unverified".

---

## Urutan Pengerjaan yang Disarankan

```
Week 1-2: P1 (OpenRouter client) + F2 (Open in Maps — pure frontend, parallel)
Week 3-4: F1 (Trip Summary) — fitur LLM paling simple, validasi pola OpenRouter
Week 5:   P2 (OAuth scopes + token storage)
Week 6-7: F4 (Calendar Export) + F3 (KML Export, tidak butuh P2, parallel)
Week 8:   F5 (Auto-Generate) — paling kompleks, butuh prompt engineering iteratif
```

### Dependency Graph

```
P1 ──┬──> F1 (Summary)
     └──> F5 (Auto-Generate)
P2 ─────> F4 (Calendar)
F2 (Open in Maps) — independen
F3 (KML Export)   — independen
```

---

## Risk Register

| Risk | Mitigasi |
|------|----------|
| LLM cost blow-up (F1, F5) | Tampilkan token usage di UI, set hard cap di backend (max 4k input token), cache summary (F1 jadi idempotent). |
| LLM hallucination nama tempat (F5) | Validate `location_name` via Places API sebelum persist. Mark "unverified" kalau tidak ketemu. |
| OAuth refresh token revoke oleh user (F4) | Error 401 jelas + tombol re-auth. Trip data tetap aman (lokal). |
| Google Calendar rate-limit (F4) | Exponential backoff + idempotent (track event_id). Bulk insert pakai batch. |
| Cross-domain import violation (F1, F3, F4 butuh data banyak domain) | Adapter pattern di package `internal/integration/` — domain tetap terisolasi. |
| Migration rollback (P2, F1, F4 semua tambah table/kolom) | Selalu test migration `up` di dev DB sebelum deploy. Pertimbangkan `down` migration walau pun tidak wajib. |
| Saved Places API tidak ada (F3) | Pilih KML export sejak awal — jangan invest di opsi yang deprecated. |

---

## Cross-Cutting Concerns

- **Error handling:** Semua error LLM/Google API di-wrap dengan `fmt.Errorf("op: %w", err)` sesuai `backend/CLAUDE.md`. Handler map ke HTTP status yang sesuai.
- **Logging:** Panggilan LLM + Google Calendar harus di-log (request ID, duration, success/error) untuk debugging. Tidak log payload lengkap (PII + cost).
- **Testing:** Setiap package baru wajib ada unit test. Mock external API (`httptest` untuk OpenRouter, mock `calendar.Service` untuk F4). Frontend hook test pakai MSW atau mock manual.
- **Documentation:** Update `docs/API.md` setiap endpoint baru. Update `docs/FEATURES.md` checkbox saat feature done. Tambah `docs/` entry kalau fitur punya behavior complex (e.g. F5 prompt engineering notes).
- **Env example:** Setiap env var baru wajib tambah ke `backend/.env.example` (comment penjelasan) + `backend/config.yaml` (default value) sesuai konvensi yang sudah ada.
