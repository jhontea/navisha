# F4 — Export to Google Calendar + Remove on Delete

Task breakdown untuk fitur **Export to Google Calendar**. Sumber rencana: `docs/PLAN_PHASE2.md` bagian F4 + P2.

## Tujuan

User klik "Export to Calendar" → backend membuat event di Google Calendar user untuk **aktivitas tipe `location`**. Saat trip dihapus dari Navisha, event terkait ikut dihapus dari Calendar.

> Keputusan scope (hasil diskusi):
> - **Hanya activity tipe `location`** yang di-export (transport & accommodation di-skip untuk MVP).
> - **Timezone UTC** untuk semua event (tidak handle timezone destinasi dulu).
> - **Tidak ada endpoint re-auth terpisah.** Session hanya 1 jam; user yang token/scope-nya kurang cukup login ulang (consent screen muncul lagi). Jadi cukup tambah scope + `access_type=offline` + `prompt=consent` di flow login utama.

## Biaya

**Google Calendar API gratis** (tidak pakai billing seperti Maps). Hanya ada quota harian (~1 juta query/hari, jauh di atas kebutuhan). Idempotensi dijaga dengan tracking `google_event_id`.

---

## Setup Google Cloud Console (manual, di luar kode)

Pada project OAuth Navisha di [console.cloud.google.com](https://console.cloud.google.com):

1. **Enable Google Calendar API** — APIs & Services → Library → cari "Google Calendar API" → Enable.
2. **Tambah scope** — APIs & Services → OAuth consent screen → Edit App → Scopes → Add → centang `https://www.googleapis.com/auth/calendar.events` → Save.
3. **Test users** (kalau consent screen status "Testing") — OAuth consent screen → Test users → Add → tambahkan email testing. Scope `calendar.events` adalah sensitive scope; tanpa verifikasi Google, hanya test users yang bisa authorize.
4. **Redirect URI** — tidak berubah (`/api/v1/auth/google/callback`).

---

## CHUNK 1 — P2: OAuth Scopes + Refresh Token Storage

Prasyarat F4. Memperluas OAuth flow untuk minta scope Calendar + simpan refresh token user.

### Masalah saat ini
- `pkg/oauth/google.go` hanya minta scope `[openid, email, profile]`.
- `GoogleAuthURL` pakai `AccessTypeOnline` → tidak dapat refresh token.
- Model `User` tidak menyimpan token Google sama sekali.

### Unit Kerja

**P2-A — OAuth scope + offline access** ✅
- `pkg/oauth/google.go` — tambah konstanta `CalendarEventsScope` + scope `https://www.googleapis.com/auth/calendar.events`.
- `internal/user/usecase.go` — `GoogleAuthURL` pakai `AccessTypeOffline` + `ApprovalForce` (`prompt=consent`) agar Google mengembalikan refresh token.

**P2-B — Migration token storage** ✅
- `migrations/008_add_user_oauth_tokens.sql` — `ALTER TABLE users ADD COLUMN google_refresh_token TEXT, google_access_token TEXT, google_token_expiry TIMESTAMPTZ, google_scopes TEXT[]` (idempotent `IF NOT EXISTS`).

**P2-C — Model + Repository** ✅
- `internal/user/model.go` — tambah field token (`GoogleRefreshToken`, `GoogleAccessToken`, `GoogleTokenExpiry *time.Time`, `GoogleScopes []string`).
- `internal/user/repository.go` + `repository_pg.go` — method `UpdateGoogleTokens(userID, token *oauth2.Token, scopes []string) error` + `GetGoogleToken(userID) (*oauth2.Token, []string, error)` (dipakai F4). `UpdateGoogleTokens` pakai `COALESCE(NULLIF(...))` agar refresh token lama tidak tertimpa kosong saat Google tidak mengembalikannya.

**P2-D — Wire ke GoogleLogin** ✅
- `internal/user/usecase.go` — setelah `Exchange`, panggil `repo.UpdateGoogleTokens` menyimpan refresh/access token + expiry + scopes (`grantedScopes` parse field `scope`). Kegagalan simpan token bersifat non-fatal (di-log, tidak membatalkan login).

**P2-E — Tests** ✅
- Tidak ada mock repo di test (handler test pakai `mockUsecase`), jadi tidak ada perubahan mock.
- `go build ./...` hijau, `go test ./...` semua paket hijau.

### Acceptance P2
- [x] Refresh token tersimpan saat login (kolom `users.google_refresh_token`).
- [x] User lama tetap bisa login (kolom baru nullable; cukup login ulang sekali untuk dapat token+scope).
- [x] `go build ./...` + `go test ./...` hijau.


> Catatan: refresh token disimpan plaintext untuk MVP. Enkripsi bisa ditambah nanti (di luar scope).

---

## CHUNK 2 — F4: Calendar Export

### Unit Kerja

> **Catatan implementasi**: alih-alih menarik SDK berat `google.golang.org/api/calendar/v3`
> (menambah ratusan paket ke vendor tree), kita pakai **Calendar REST API langsung**
> lewat `oauth2.Config.Client(ctx, token)` yang sudah auto-refresh access token dari
> refresh token. Zero dependency baru — sama seperti pola `fetchGoogleUserInfo` di domain user.

**F4-A — Google Calendar client** ✅
- `backend/pkg/googlecalendar/client.go` — wrapper REST tipis: `New(*oauth2.Config)`, `CreateEvent(ctx, token, calendarID, Event) (eventID, error)`, `DeleteEvent(ctx, token, calendarID, eventID) error`. HTTP 401 → sentinel `ErrReauthRequired`. `Event` punya `Summary/Location/Description/Start/End` (`EventDateTime{DateTime, Date, TimeZone}`), all-day bila tanpa jam.

**F4-B — Migration mapping** ✅
- `migrations/009_add_calendar_exports.sql` — `calendar_exports(id, user_id FK, trip_id FK, source_type, source_id, google_event_id, google_calendar_id DEFAULT 'primary', created_at, UNIQUE(source_type, source_id))`.

**F4-C — Domain `internal/calendar_export/`** ✅
- `model.go` — `CalendarItem` (ActivityID, Title, LocationName, Date, StartTime, EndTime), interface `DataProvider` + `TokenProvider`.
- `repository.go` + `repository_pg.go` — `Insert`, `ListByTrip`, `DeleteByTrip`, `ExistsBySource`.
- `usecase.go` — `ExportTrip(ctx, userID, tripID)` (idempotent: skip activity yang sudah punya row), `RemoveTrip(ctx, userID, tripID)` (hapus event di Google + baris DB). Event UTC. Hanya activity tipe `location` dengan koordinat/lokasi.
- Adapter di `internal/integration` implement `DataProvider`; user usecase implement `TokenProvider` (`GetGoogleToken`).

**F4-D — Hook ke delete trip** ✅
- `internal/trip` handler memanggil cleanup calendar setelah delete sukses (fire-and-forget; error cleanup di-log, tidak membatalkan delete). Trip usecase tetap bersih — wiring di handler/main.

**F4-E — Handler** ✅
- `POST /api/v1/trips/:id/calendar-export` — export.
- `DELETE /api/v1/trips/:id/calendar-export` — hapus semua event ter-export.
- Token belum ada / revoked → 401 `{ code: "GOOGLE_REAUTH_REQUIRED" }`.

**F4-F — Frontend** ✅
- `features/calendar-export/api.ts` + `hooks/useCalendarExport.ts` (`useExportToCalendar`, `useRemoveFromCalendar`).
- `components/CalendarExportCard.tsx` — kartu di Trip Overview: tombol "Export to Calendar" + "Remove", dua `ConfirmDialog`, banner sukses/error.
- 401 dengan `code === "GOOGLE_REAUTH_REQUIRED"` → banner kuning + tombol "Sign in with Google" (redirect ke `/auth/google`).
- Di-mount di `trips/[id]/overview/page.tsx` di bawah AI Summary.

### Acceptance F4
- [x] Export trip → activity location dibuat sebagai event Calendar (UTC) — logika `buildEvent` ter-unit-test.
- [x] Delete trip → event terkait dihapus (hook `onDelete` di trip handler memanggil `RemoveTripInternal`).
- [x] Idempotent: export 2x tidak duplikat (`ExistsBySource` + `UNIQUE(source_type, source_id)` + `ON CONFLICT DO NOTHING`).
- [x] Token revoked/absent → 401 `GOOGLE_REAUTH_REQUIRED`, data trip tetap aman.
- [x] `go build`/`go test ./...` hijau; frontend `npm run build` sukses.

> Catatan verifikasi: build + unit test hijau. Smoke test end-to-end (klik Export → cek event muncul di Google Calendar) perlu dijalankan manual oleh user dengan akun test yang sudah login ulang (punya refresh token + scope Calendar).

---

---

## CHUNK 3 — Review Fixes (post-review)

Hasil review user setelah implementasi awal:

**R1 — Tombol "Remove" muncul padahal belum pernah export** ✅
- Tambah endpoint `GET /trips/:id/calendar-export` → `{ exported_count }` (repo `CountByTrip`).
- Frontend `useCalendarExportStatus` query; tombol **Remove hanya tampil bila `exported_count > 0`**.
- Saat sudah ada export, tombol utama berubah label jadi **"Re-sync"** + subteks "N activities synced".

**R2 — Waktu jangan dipaksa UTC** ✅
- `parseDayTime` sekarang mengembalikan datetime **naive wall-clock tanpa offset** (mis. `2026-07-01T09:30:00`), bukan dikonversi ke UTC.
- Event dikirim dengan `timeZone: "Asia/Jakarta"` (konstanta `defaultTimeZone`) sehingga Google menampilkan **persis jam yang diinput user**, tidak bergeser.

**R3 — Re-export setelah ada perubahan hari/aktivitas** ✅
- `ExportTrip` sekarang **idempotent sync**, bukan sekali-jalan:
  - aktivitas baru → dibuat event-nya,
  - aktivitas yang sudah tidak ada (hari dikurangi / activity dihapus) → event-nya **di-prune** dari Google + baris mapping dihapus,
  - aktivitas yang sudah ada → dibiarkan.
- Bisa di-Re-sync berkali-kali; selalu mencerminkan state terbaru. Response: `{ created, removed, total }`.
- Repo tambah `DeleteByID`. Catatan: edit waktu/judul activity yang **sudah** ter-export belum tercermin (event lama tidak di-update); untuk MVP cukup hapus activity lalu re-sync, atau Remove lalu Export ulang. (Tercatat sebagai keterbatasan.)

### Acceptance CHUNK 3
- [x] Tombol Remove hilang saat belum ada export; muncul setelah export.
- [x] Jam event = jam input (tanpa pergeseran UTC), tagged `Asia/Jakarta`.
- [x] Re-sync menambah event baru & menghapus event aktivitas yang dihapus.
- [x] `go build`/`go test ./internal/calendarexport/...` hijau; frontend `npm run build` sukses.

---

## Status

- CHUNK 1 (P2): **selesai** — build + test hijau.
- CHUNK 2 (F4): **selesai** — build + test hijau.
- CHUNK 3 (review fixes): **selesai** — build + test hijau. Perlu smoke test manual end-to-end di Google Calendar.




