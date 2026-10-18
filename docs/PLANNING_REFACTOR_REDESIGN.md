# Planning — Refactor Kode & Redesign Tampilan

> **Tanggal:** 2026-10-13
> **Status:** Diarsipkan. Bagian B (Redesign V1) sudah diterapkan dan digantikan oleh [PLANNING_REDESIGN_V2.md](PLANNING_REDESIGN_V2.md). Status bagian A (refactor) tidak dilacak lagi di sini.
> **Ringkasan:** Dua bagian kerja yang bisa jalan paralel:
> **A. Refactor** (backend Go + frontend Next.js), supaya kode lebih modular, mudah dibaca dan dirawat, efisien, dan minim bug.
> **B. Redesign** (UI/UX), supaya tampilan konsisten, jelas, tidak terasa "AI slop", dan nyaman di desktop maupun mobile.
> **C.** Rekomendasi tambahan di luar daftar tujuan.
>
> Semua temuan di bawah berasal dari eksplorasi kode per tanggal di atas. Angka (jumlah file, kemunculan class) dihitung dengan grep, jadi anggap sebagai indikasi besaran, bukan angka pasti.

---

## 0. Kondisi saat ini (angka penting)

| Area | Temuan |
|---|---|
| Backend | 18 package `internal/` + 5 `pkg/`. Clean Architecture sudah konsisten (`model / repository / usecase / handler`). |
| Backend test | Ada unit test di hampir semua domain. **Tidak ada test** di `apperr`, `migrate`, `quota`, `pkg/currency`, `pkg/oauth`. |
| Backend lint | **Tidak ada** `.golangci.yml`. CI hanya `go build` + `go test`. |
| Frontend | 123 file `.tsx`. **Semua 13 halaman dashboard adalah client component.** |
| Frontend test | **0 file test.** CI hanya `lint` + `build`. |
| File besar | `DayActivities.tsx` 825 baris, `ActivityForm.tsx` 725, `share/[token]/page.tsx` 545, `TransportationForm.tsx` 532, `trips/[id]/overview/page.tsx` 466 |
| Primitive UI | 108 `<button>` mentah vs 19 `<Button>`; 38 `<input>` mentah vs 10 `<Input>` |
| Ukuran teks | 146 nilai arbitrary px; `text-[10px]` ×47 dan `text-[11px]` ×26, terlalu kecil untuk dibaca |
| Dekorasi | 75 gradient, 30 `backdrop-blur`, 31 ikon sparkle/`auto_awesome` |
| CI/CD | Workflow hanya terpicu saat **push ke `main`**, dan push itu langsung deploy ke VPS. Belum ada pengecekan di PR. |

---

# BAGIAN A — REFACTOR

## A1. Bug & risiko yang sudah terkonfirmasi (kerjakan duluan)

| # | Masalah | Bukti | Dampak |
|---|---|---|---|
| A1.1 | **Ganti base currency trip membuat total budget salah.** Update trip mengganti `base_currency` tanpa mengonversi ulang expense. Ringkasan budget menjumlahkan `converted_amount` lama (dalam mata uang lama) lalu menampilkannya dengan label mata uang baru. | `internal/trip/usecase.go:228`, `internal/expense/repository_pg.go:159` (`SUM(converted_amount)` tanpa filter `base_currency`) | Angka budget bisa meleset jauh, misalnya IDR dibaca sebagai USD. |
| A1.2 | Ownership di `ListByDayIDs` hanya dicek di **hari pertama**. Asumsinya: caller menjamin semua `dayIDs` milik trip yang sama. | `internal/activity/usecase.go:65-75` | Aman untuk caller sekarang, tapi rapuh: caller baru bisa membocorkan data. Cek ownership di level trip sebaiknya ada di SQL (`WHERE d.trip_id = $x AND t.user_id = $y`). |
| A1.3 | Timeout global 300 detik dipasang untuk **semua** request, padahal hanya endpoint LLM yang butuh waktu selama itu. | `cmd/server/main.go` (`Timeout(300 * time.Second)`) | Request CRUD yang macet menahan koneksi DB sampai 5 menit. |
| A1.4 | Edit trip punya **dua jalur**: inline edit di layout dan halaman `/trips/[id]/edit`. | `app/(dashboard)/trips/[id]/layout.tsx:49-55`, `trips/[id]/edit/page.tsx` | Logika validasi dobel, perilaku bisa berbeda. |
| A1.5 | Dokumentasi tidak sesuai kode: `backend/CLAUDE.md` menyebut migrasi sampai 010 (aktual 020), `access_ttl: 900` (aktual 10800), dan flag `AUTO_MIGRATE` (aktual migrasi selalu jalan). Roadmap di README masih mencentang "belum" untuk fitur yang sudah ada. | `backend/CLAUDE.md`, `backend/config.yaml:27`, `cmd/server/main.go:119` | Membingungkan kontributor dan AI agent. |

**Rencana A1.1 (rekomendasi):** saat base currency berubah, konversi ulang semua expense trip itu dalam satu transaksi (`trip.Update` memanggil interface `ExpenseRebaser`). Alternatif yang lebih sederhana: Summary mengonversi saat query untuk baris yang `base_currency`-nya berbeda. Tambahkan test untuk skenario IDR→USD.

## A2. Refactor backend

### A2.1 Handler boilerplate (readability, lebih sedikit bug)
- Ada 38 kemunculan `userID, ok := c.Get(middleware.UserIDKey).(string)` yang diulang di semua handler. Pindahkan ke helper `middleware.UserID(c) (string, error)` atau handler wrapper generik.
- Ada 19 `c.Bind` dengan validasi manual yang tersebar. Pilih satu pendekatan:
  - rekomendasi: method `Validate() error` di setiap request struct, ditambah helper `bindAndValidate(c, &req)`;
  - atau `go-playground/validator`.
- Ada 88 response berbentuk `map[string]any{...}`. Ganti dengan **DTO bertipe** per domain (`TripResponse`, `ListResponse[T]`). Manfaatnya: kontrak API eksplisit dan bisa di-generate ke tipe TypeScript (lihat C2).
- Error mapping (`apperr.MapHTTP`) sudah bagus. Standarkan supaya setiap handler punya satu `mapErr`, dan bentuk error JSON-nya seragam (`{code, message}`).

### A2.2 Wiring & modularitas
- `cmd/server/main.go` (435 baris) berisi config, koneksi, middleware, health, dan seluruh wiring domain. Pecah menjadi:
  - `internal/app/` (atau `cmd/server/wire.go`) dengan fungsi `buildDomains(db, rdb, cfg) []RouteRegistrar`;
  - `internal/httpserver/` untuk stack middleware dan health;
  - `main.go` tinggal sekitar 50 baris.
- Pola `trip.Handler.SetOnDelete` (setter setelah konstruksi) diganti dengan opsi di constructor, supaya dependensi tidak bisa terlupa.
- `internal/trip` adalah domain terbesar (usecase 402, repo 460, handler 353 baris). Pisahkan **day** (title/notes/regenerasi tanggal) menjadi sub-file `day_usecase.go` / `day_repository_pg.go`, atau package `tripday`.

### A2.3 Data access & performa
- Timeout per route group: CRUD 15 detik, LLM 300 detik. Hapus timeout global yang tunggal.
- Audit query `trip_context` / `dashboard_handler` dengan `EXPLAIN ANALYZE` untuk memastikan index migrasi 011 terpakai.
- Pastikan setiap operasi yang menulis ke lebih dari satu tabel memakai transaksi. Yang sudah memakai tx: trip, activity, transport, accommodation, user, tripshare. Expense saat currency berubah belum (lihat A1.1).
- Tambahkan helper `withTx(ctx, pool, func(tx) error)` supaya pola `BeginTx / defer Rollback / Commit` tidak diulang di setiap repo.

### A2.4 Tooling & test
- Tambah `.golangci.yml` (errcheck, govet, staticcheck, revive, gosec, bodyclose, sqlclosecheck, contextcheck) dan jalankan di CI.
- Test untuk `apperr`, `migrate` (urutan dan idempoten), `quota`, `pkg/oauth`, serta skenario A1.1.
- Integration test (`tests/integration`) dijalankan di CI dengan service container Postgres dan Redis.

## A3. Refactor frontend

> Catatan untuk Ahmad: di React, file 800 baris biasanya berarti satu komponen memegang **data fetching, state UI, dan render banyak varian** sekaligus. Polanya mirip memisah handler, usecase, dan repo di Go: **hook** (data/logic) → **container** (merangkai) → **presentational component** (murni render dari props).

### A3.1 Pecah god component

| File | Isi yang bercampur | Rencana pemecahan |
|---|---|---|
| `features/activity/components/DayActivities.tsx` (825) | Util tanggal (`extractTime`, `toSortKey`, `dateMatches`), 3 kartu timeline (transport, stay, activity), dnd-kit sortable, mutasi | `lib/timeline.ts` (fungsi murni dan testable), `TimelineItem/*` per tipe, `useDayTimeline(dayId)` (menggabungkan activity, transport, dan stay menjadi satu list terurut), `SortableList` generik |
| `ActivityForm.tsx` (725) | Form 3 tipe (location / note / todo) jadi satu | Satu `ActivityForm` sebagai shell, ditambah `LocationFields`, `NoteFields`, `TodoFields`. Schema Zod per tipe di `features/activity/schema.ts` |
| `TransportationForm.tsx` (532), `AccommodationForm.tsx` (428), `ExpenseForm.tsx` (312) | Pola "form + linked expense" yang mirip-mirip | Komponen field bersama di `components/forms/` (`MoneyField`, `DateTimeField`, `LocationField`), dan hook `useEntityForm` |
| `app/share/[token]/page.tsx` (545) | Fetch, render ulang itinerary versi read-only | Jadikan **Server Component** (fetch di server, SEO dan load lebih cepat). Pakai ulang komponen timeline read-only dari `features/activity` |
| `trips/[id]/overview/page.tsx` (466) | Checklist, stats, budget, summary | Pecah per section (`OverviewChecklist`, `OverviewBudget`, dst.) di `features/trip/components/overview/` |
| `trips/[id]/layout.tsx` | 2 query yang dipilih berdasarkan pathname, ditambah state inline edit | Layout hanya memegang hero dan tab. Edit pindah ke dialog atau halaman `/edit` saja (lihat A1.4) |
| `NavBar.tsx` (332) | Nav desktop dan mobile dalam satu file | `DesktopNav`, `MobileTabBar`, dan config `navItems` bersama |

### A3.2 Data layer (TanStack Query)
- Query key saat ini campuran: ada factory (`listKey(tripId)`) dan ada literal (`["expenses","summary",tripId]`, `["trips","upcoming",6]`). Buat **satu factory per feature** (`features/<f>/queryKeys.ts`) dan larang literal lewat lint rule atau code review. Ini mencegah bug cache tidak ter-invalidate.
- Kumpulkan invalidasi lintas fitur di satu tempat. Contoh: membuat transport menghasilkan expense, jadi harus meng-invalidate expenses, summary, dan overview.
- Zustand sudah minimal (hanya `auth` dan `currency`). Pertahankan aturannya: **server state hanya di Query, Zustand hanya untuk UI state lokal.**

### A3.3 Server vs Client Component
- 13 dari 13 halaman dashboard memakai `"use client"`. Target: `page.tsx` menjadi Server Component tipis yang merender komponen client di level daun. Ini prioritas sedang, karena auth berbasis cookie membuat fetch di server butuh sedikit setup (forward cookie ke backend).
- Prioritaskan halaman publik dulu: `share/[token]`, `privacy`, `terms`, `contact`, dan landing.

### A3.4 Konsistensi primitive
- Ganti 108 `<button>` dan 38 `<input>` mentah dengan primitive coss ui (`Button`, `Input`, `Select`, `Textarea`, `Label`). Kalau varian yang dibutuhkan belum ada (misalnya icon button, chip, segmented control), buat wrapper di `components/` (bukan di `components/ui/` yang hasil generate).
- Tambah ESLint rule `no-restricted-syntax` untuk melarang `<button>`/`<input>` mentah di luar `components/`.

### A3.5 Map & lokasi
- Ada dua renderer peta (`GoogleMapCanvas`, `MapLibreCanvas`) dan dua provider autocomplete. Satukan di balik interface `MapRenderer` / `LocationSearch` supaya `TripMap` tidak tahu provider mana yang dipakai. Lalu putuskan: **MapLibre jadi default, Google hanya opsional**, sehingga varian Google cukup dirawat seminimal mungkin.

### A3.6 Tooling & test
- Vitest + Testing Library untuk util murni (`timeline.ts`, `currency.ts`, `resolveDraftLocations.ts`, schema Zod).
- Playwright untuk 3 alur kritis: buat trip, tambah aktivitas, dan tambah expense lalu cek total budget.
- Pertimbangkan `noUncheckedIndexedAccess: true` di `tsconfig.json`.

## A4. Urutan eksekusi refactor

| Fase | Isi | Effort |
|---|---|---|
| R0 | CI jalan di PR (bukan hanya `main`), golangci-lint, Vitest setup, update dokumen yang sudah basi (A1.5) | S |
| R1 | Fix A1.1 (currency) beserta test, A1.2, A1.3 | S–M |
| R2 | Backend: helper handler, DTO, pecah `main.go`, `withTx` | M |
| R3 | Frontend: query key factory, pecah `DayActivities` dan `ActivityForm`, satu jalur edit trip | M–L |
| R4 | Frontend: migrasi ke primitive coss ui. Lakukan **bersamaan dengan redesign B**, supaya tidak menyentuh file yang sama dua kali | L |
| R5 | Server Components untuk halaman publik, abstraksi map | M |

---

# BAGIAN B — REDESIGN UI/UX

## B1. Temuan utama

1. **Dekorasi berlebihan ("AI slop").** 75 gradient (`bg-gradient-to-r/br`), 30 `backdrop-blur`, class `glass`, `glass-sm`, `glass-lg`, `glass-border`, `glass-highlight`, `text-gradient`, `text-gradient-sunset`, `text-gradient-ocean`, dan 31 ikon sparkle. Copy landing memakai pola klise ("Own your adventure", "journey starts here").
2. **Token tidak disiplin.**
   - 9 varian radius dipakai bersamaan (`rounded`, `-md`, `-lg`, `-xl`, `-2xl`, `-3xl`, `-full`, arbitrary).
   - 8 varian shadow, ditambah utilitas kembar `shadow-soft` dan `soft-shadow`.
   - Dua font judul (`font-display` ×21 dan `font-heading` ×23).
   - 29 hex hardcoded di komponen.
3. **Skala teks terlalu kecil dan tidak beraturan.** `text-[10px]` dan `text-[11px]` muncul 73 kali. Di mobile ini di bawah ukuran minimum yang nyaman dibaca (≥12px untuk label, ≥14px untuk body).
4. **Komponen kembar.** Tombol dan input dibuat ulang manual di banyak tempat (lihat A3.4), jadi tinggi, padding, radius, dan focus state-nya berbeda-beda.
5. **Navigasi berlapis di mobile.** Ada bottom tab global (Home / My Trips / Currency / Profile, `NavBar.tsx:21-24`), ditambah tab trip yang sticky (Overview / Itinerary / Transport / Stay / Budget, `TripTabBar.tsx:19-23`), ditambah hero trip. Di dalam trip, layar kecil memakai dua bar navigasi dan ruang kontennya sempit. *(Perlu dicek visual di device.)*
6. **Istilah tidak konsisten.** "Stay" vs "Accommodation" ("Accommodation arranged" di checklist overview vs tab "Stay"), "Home" vs "Dashboard" (label "Home" menuju `/dashboard`), "Budget" vs "Expenses".
7. **Penempatan fitur.** "Currency" adalah converter standalone tapi mendapat slot utama di bottom nav. Padahal konversi paling relevan muncul di dalam Budget atau Expense. Fitur AI (generate dan summary) tersebar tanpa titik masuk yang jelas.

## B2. Fondasi desain (kerjakan sebelum halaman)

Buat **satu sumber kebenaran** di `tailwind.config.ts` + `globals.css`, lalu dokumentasikan di `docs/DESIGN_SYSTEM.md`.

| Token | Aturan yang diusulkan |
|---|---|
| **Warna** | 1 warna primary, 1 accent (opsional), skala netral, dan warna semantik (`success`, `warning`, `danger`, `info`). Warna kategori expense (food, transport, stay, activity, shopping, souvenir) sebagai token tersendiri yang dipakai konsisten di chip, chart, dan peta. Dilarang hex di komponen. Light/dark diturunkan dari token. |
| **Tipografi** | Satu family untuk UI, opsional satu untuk display, **pakai salah satu saja** dari `font-display`/`font-heading`. Skala tetap: 12 / 14 / 16 / 18 / 20 / 24 / 30. Dilarang `text-[Npx]`. Angka uang memakai `tabular-nums`. |
| **Spasi** | Kelipatan 4px. Gutter halaman: mobile 16px, desktop 24–32px. Jarak antar section 24px (mobile) / 32px (desktop), antar elemen dalam card 12–16px. |
| **Radius** | Tiga nilai saja: `sm` (input/chip), `md` (card/button), `full` (avatar/pill). |
| **Shadow** | Dua level: `sm` (card) dan `lg` (popover/dialog). Hapus `shadow-chromatic`, `shadow-primary`, `trip-card-shadow`, dan duplikatnya. |
| **Ikon** | Lucide saja (hapus `MaterialIcon`). Ukuran 16 / 20 / 24. Ikon sparkle hanya untuk satu tempat: titik masuk fitur AI. |
| **Motion** | Durasi 150 / 250ms dan satu easing. Hormati `prefers-reduced-motion`. Kurangi `animate-fade-in-up` di setiap halaman. |
| **Komponen** | Button (primary, secondary, ghost, danger; ukuran sm/md), Input/Select/Textarea, Card, Badge/Chip, Tabs, Dialog, BottomSheet, EmptyState, Skeleton, StatTile, MoneyText. |

**Aturan anti AI-slop (masuk ke design doc):**
- Tidak ada gradient pada teks. Gradient hanya boleh di cover trip sebagai fallback ketika foto tidak ada.
- Tidak ada glass/blur kecuali pada bar sticky yang berada di atas konten.
- Satu kartu = satu border **atau** satu shadow, bukan dua-duanya ditambah gradient.
- Ilustrasi hanya di empty state, dan gayanya seragam.
- Copy menyebut aksi dan fakta, bukan slogan.

## B3. Arsitektur informasi & navigasi

**Usulan struktur:**

```
Global (desktop: sidebar kiri / top bar; mobile: bottom tab 3–4 item)
├── Trips (home)           ← gabung Dashboard + My Trips: trip mendatang di atas, sisanya list
├── Plan with AI           ← titik masuk generate yang jelas
├── Tools → Currency       ← turun dari bottom nav, juga diakses dari Budget
└── Profile

Di dalam trip (/trips/[id])
├── Header ringkas (judul, tanggal, menu ⋯: Edit, Share, Delete)
├── Tabs: Itinerary · Map · Bookings (Transport + Stay) · Budget · Summary
└── Mobile: tab trip MENGGANTIKAN bottom tab global (dengan tombol back), tidak ditumpuk
```

Keputusan yang perlu dibuat:
- **Gabung Dashboard dan My Trips?** Saat ini ada `/dashboard` dan `/trips`, isinya kemungkinan tumpang tindih.
- **Gabung Transport dan Stay menjadi "Bookings"?** Hasilnya 5 tab menjadi 4–5 dengan pengelompokan yang lebih jelas.
- **Overview tetap sebagai tab** atau dijadikan header ringkas plus checklist di atas Itinerary?
- **Map sebagai tab sendiri** (saat ini toggle list/map di dalam Itinerary). Di desktop: split view, list di kiri dan peta di kanan.

## B4. Layout desktop vs mobile

| Layar | Mobile (<768px) | Desktop (≥1024px) |
|---|---|---|
| Trips list | 1 kolom kartu | Grid 2–3 kolom, maksimal lebar 1200px |
| Itinerary | Day picker horizontal + timeline | **Split view**: hari dan timeline di kiri (~420px), peta sticky di kanan |
| Budget | Ringkasan → list expense → FAB tambah | Ringkasan dan chart di kiri, tabel expense di kanan (sort dan filter kategori) |
| Form (activity, transport, stay, expense) | **BottomSheet** full height | **Dialog** atau side panel, tidak pindah halaman |
| Share page | Read-only timeline | Split timeline dan peta seperti itinerary |

Prinsip: desktop **bukan versi mobile yang direntangkan**. Pakai ruang lebar untuk menampilkan konteks berdampingan (peta, ringkasan).

## B5. Interaksi & state

- **Loading:** skeleton yang bentuknya sama dengan konten (sudah ada `skeleton.tsx`, tinggal diseragamkan). Spinner hanya untuk aksi di dalam tombol.
- **Empty state:** setiap list punya 1 kalimat penjelasan dan 1 CTA utama.
- **Error:** pesan spesifik dan tombol coba lagi. Ganti teks generik "Something went wrong" (dipakai di 3+ tempat).
- **Mutasi:** optimistic update untuk reorder, toggle todo, dan hapus (dengan toast **Undo**, bukan confirm dialog untuk hal kecil). Confirm dialog hanya untuk hapus trip.
- **Form panjang:** `ActivityForm` dipecah menjadi field inti dan bagian "More details" yang bisa dibuka. Validasi inline saat blur, bukan hanya saat submit.
- **Aksesibilitas:** focus ring yang terlihat dan seragam, target sentuh ≥44px, semua icon button punya `aria-label`, drag-and-drop punya alternatif keyboard (dnd-kit mendukung `KeyboardSensor`).

## B6. Copywriting

Buat `docs/COPY_GUIDE.md` berisi:
- **Bahasa:** UI saat ini full English. Tentukan target user. Kalau mayoritas Indonesia, siapkan i18n (lihat C5), atau setidaknya pertahankan satu bahasa secara konsisten.
- **Glosarium istilah tetap:** Trip, Day, Activity, Transport, Stay, Expense, Budget, Base currency. Satu istilah untuk satu konsep, dipakai di tab, judul, tombol, dan pesan.
- **Tombol** memakai kata kerja + objek: "Add expense", "Save changes", "Delete trip". Hindari "Submit" atau "OK".
- **Pesan error** menjelaskan apa yang terjadi dan apa yang bisa dilakukan: "Couldn't load rates. Showing amounts in original currency."
- **Kurangi slogan** di landing dan dashboard. Ganti dengan manfaat konkret ("Plan each day, see it on a map, and track spending in your currency").

## B7. Visualisasi data

- **Budget:** ganti ring dekoratif dengan **bar progress horizontal** (terpakai vs budget, sisa dalam angka jelas) dan **stacked bar / bar per kategori** yang memakai token warna kategori. Ring sulit dibandingkan antar kategori.
- **Per hari:** sparkline atau bar kecil pengeluaran per hari di tab Budget.
- **Angka:** format mata uang konsisten lewat satu helper (`MoneyText`), selalu tampilkan kode mata uang, dan `tabular-nums`.
- **Peta:** marker bernomor sesuai urutan aktivitas, warna per hari, rute tergambar per hari. Klik item timeline menyorot marker, dan sebaliknya.
- **Status checklist overview:** cukup progress "3/5 siap" dan list, tanpa dekorasi.

## B8. Urutan eksekusi redesign

| Fase | Isi | Effort |
|---|---|---|
| D0 | Audit visual: screenshot semua halaman di 390px dan 1440px sebagai baseline | S |
| D1 | Fondasi token (B2), hapus utilitas glass/gradient/shadow kembar, `DESIGN_SYSTEM.md` + `COPY_GUIDE.md` | M |
| D2 | Komponen dasar (Button, Field, Card, StatTile, MoneyText, EmptyState, BottomSheet/Dialog responsif). Gabungkan dengan R4 | M |
| D3 | IA & navigasi baru (B3): bottom tab, tab trip, header trip | M |
| D4 | Halaman per prioritas: Itinerary (split view) → Budget → Trips home → Bookings → Share → Landing | L |
| D5 | Copy pass seluruh UI dan visualisasi budget baru | M |
| D6 | QA: a11y (axe), visual regression (Playwright screenshot), uji di device asli | S–M |

---

# BAGIAN C — REKOMENDASI TAMBAHAN

| # | Rekomendasi | Alasan |
|---|---|---|
| C1 | **CI di Pull Request + branch protection `main`** | Sekarang setiap push ke `main` langsung deploy. Jalankan lint, test, dan build di PR, lalu deploy hanya setelah merge. |
| C2 | **Kontrak API OpenAPI → generate tipe TS** | Tipe di `features/*/types.ts` ditulis ulang manual dari backend dan rawan berbeda. Bisa pakai `oapi-codegen` di Go dan `openapi-typescript` di frontend. |
| C3 | **Error tracking** (Sentry atau setara) di backend dan frontend | Sudah ada slog dan `WebVitalsReporter`, tapi belum ada agregasi error dari client. |
| C4 | **Performance budget** | Batasi ukuran JS per route (cek dengan `@next/bundle-analyzer`). MapLibre dan Google Maps hanya dimuat di tab yang memakai peta. |
| C5 | **i18n (id/en)** dengan `next-intl` | Kalau target user Indonesia. Sekalian memusatkan semua copy (membantu B6). |
| C6 | **Offline-first ringan** | Sudah ada service worker dan `queryPersistence.ts`. Pastikan itinerary bisa dibaca offline saat perjalanan (sinyal sering hilang di tempat wisata). |
| C7 | **Export / print itinerary** (PDF atau .ics) | Kebutuhan umum traveler. Tabel calendar sempat dibuat lalu dihapus (migrasi 009/010), jadi perlu dievaluasi ulang alasannya. |
| C8 | **Backup DB terjadwal + uji restore** | Dari `DEPLOY.md` belum terlihat ada strategi backup Postgres di VPS. |
| C9 | **Storybook / halaman `/dev/ui`** | Katalog komponen dan token supaya konsistensi desain bisa dicek tanpa membuka setiap halaman. |
| C10 | **Analytics produk minimal** (event: trip dibuat, AI generate dipakai, expense ditambah) | Supaya prioritas redesign berikutnya berbasis data. |
| C11 | **Rapikan `WORKLOG.md` (184KB)** | Ringkas ke `docs/decisions/` (ADR singkat). File sebesar ini berat dibaca manusia maupun AI agent. |
| C12 | **Health check yang lebih kaya** | `/health` (liveness) dipisah dari `/ready` (cek DB, Redis, dan opsional provider LLM). |

---

## D. Keputusan (diputuskan 2026-10-13)

| # | Topik | Keputusan |
|---|---|---|
| 1 | **A1.1** | **Konversi ulang** semua expense trip dalam satu transaksi saat base currency berubah. |
| 2 | **Bahasa UI** | **Tetap English.** Fokus pada konsistensi istilah (glosarium di `COPY_GUIDE.md`), tanpa i18n. C5 ditunda. |
| 3 | **Navigasi** | Semua usulan B3 disetujui: gabung Dashboard + My Trips menjadi **Trips**, Transport + Stay menjadi **Bookings**, **Currency** turun dari bottom nav (masuk Tools dan diakses dari Budget), **Map** menjadi tab sendiri (split view di desktop). |
| 4 | **Overview** | Tab Overview dihapus, diganti **header ringkas** + checklist di atas Itinerary. Tab trip: Itinerary · Map · Bookings · Budget · Summary. |
| 5 | **Map** | **MapLibre (OpenFreeMap) default**, Google Maps tetap opsional dengan perawatan minimal. |
| 6 | **Urutan kerja** | **R0 → R1 → D0/D1 → R4+D2**, sisanya paralel. |
| 7 | **Arah visual** | Acuan mood: **Wanderlog**. Travel-centric, peta dominan, split view list + peta, warna cerah tapi bersih. |

Catatan:
- C11 (rapikan `WORKLOG.md`) sudah selesai: file dihapus di commit "remove unused docs".
- Untuk dev lokal, backend memakai **database Neon production** dan migrasi jalan otomatis saat server start. Sebelum R1 (fix A1.1, kemungkinan menambah migrasi atau mengubah data), siapkan **Neon branch** terpisah untuk dev.
