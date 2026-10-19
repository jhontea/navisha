# Planning — Perbaikan Hasil Audit UI (2026-10-19)

> **Tanggal audit:** 2026-10-19
> **Status:** Plan disetujui (K1–K3), belum ada task yang dikerjakan. Berikutnya: U1. Lihat [Tracker](#tracker-progres).
> **Konteks:** Audit memakai rubrik plugin `ux-ui-agent-skills` (design-review + a11y-audit: WCAG 2.2 AA, heuristik Nielsen) ditambah axe-core dan cek visual. Halaman publik diaudit di 1440px, 375px, dan 320px. Dashboard diaudit di layout mobile 457px dengan data asli.
> Screenshot audit ada di `design-audit/ui-audit-2026-10-19/` (gitignored).

## Cara memakai dokumen ini (untuk sesi baru)

1. Baca bagian **Tracker** dan ambil task pertama yang statusnya `todo` (ikuti urutan, kecuali diminta lain).
2. Baca detail task-nya di bagian **Task**: file, langkah, dan kriteria selesai.
3. Jelaskan rencananya ke Ahmad dan tunggu persetujuan sebelum mengubah kode.
4. Buat branch dari `main` dengan nama yang tertulis di task. Satu task = satu branch = satu PR (PR dibuat manual oleh Ahmad).
5. Verifikasi di runtime (lihat **Cara verifikasi**), jangan hanya mengandalkan unit test.
6. Setelah selesai, perbarui baris task di **Tracker** (status, branch/PR, tanggal) dan tambahkan catatan singkat di **Log progres**. Perubahan dokumen ini ikut di-commit di branch task yang sama.

Status: `todo` → `in progress` → `review` (PR dibuka) → `done` (merge). Pakai `skip` jika task dibatalkan, dan tulis alasannya di log.

## Tracker progres

| ID | Tingkat | Ringkasan | Branch | Status | PR / tanggal |
|---|---|---|---|---|---|
| U1 | Sedang (semua halaman dashboard) | `<main>` bersarang dan duplikat | `fix/a11y-main-landmark` | todo | |
| U2 | Serius | Kontras `text-primary` 4.25:1 di `/currency` | `fix/a11y-primary-contrast` | todo | |
| U3 | Serius | Tabel `/privacy` tidak bisa difokus dengan keyboard (320px) | `fix/a11y-privacy-table` | todo | |
| U4 | Minor | Urutan heading melompat (Itinerary, Budget) | `fix/a11y-heading-order` | todo | |
| U5 | Serius (visual) | Teks hero landing menimpa ilustrasi di mobile | `fix/landing-hero-mobile` | todo | |
| U6 | Minor | Kartu login di mobile terlalu tinggi | `fix/login-card-mobile` | todo | |
| U7 | Minor | Pemilih bahasa di Summary sempit | `fix/summary-language-select` | todo | |
| U8 | Minor (desain) | Kartu fitur landing kosong di bagian bawah | `feat/landing-feature-previews` | todo | |
| U9 | Minor (desain) | Trip tanpa cover hanya berupa gradien kosong | (ikut V5 redesign) | todo | |
| U10 | Audit | Audit lanjutan: dashboard desktop + dark mode | — | todo | |

## Keputusan

| # | Pertanyaan | Rekomendasi | Keputusan |
|---|---|---|---|
| K1 | U1: ubah layout saja, atau rapikan tiap screen? | Ubah layout saja (1 file) | Setuju — ubah layout saja (2026-10-19) |
| K2 | U5: scrim gelap, atau atur ulang posisi ilustrasi? | Scrim gradien di mobile | Setuju — scrim gradien di mobile (2026-10-19) |
| K3 | U8 dan U9 dikerjakan sekarang atau masuk backlog? | U8 sekarang (setelah U1–U7); U9 ikut V5 di [PLANNING_REDESIGN_V2.md](PLANNING_REDESIGN_V2.md) | Setuju — U8 setelah U1–U7, U9 ikut V5 (2026-10-19) |

Isi kolom "Keputusan" saat Ahmad sudah memutuskan. Jangan mulai task yang keputusannya masih `_belum_`.

## Bukan masalah (jangan diperbaiki)

- Tombol bulat di kanan bawah yang menutupi tab terakhir nav mobile adalah **TanStack Query devtools**. Tombol "N" adalah indikator dev Next.js. Keduanya hanya muncul di mode dev.
- Landing tidak mengikuti `prefers-color-scheme` karena memang disengaja: tema bawaan light, dark hanya jika dipilih user (keputusan #9 di PLANNING_REDESIGN_V2).
- Peta `/map` sempat terlihat buram karena tile belum selesai dimuat.
- Tidak ada overflow horizontal di halaman mana pun, termasuk di 320px.

---

## Task

### U1 — Landmark `<main>` bersarang

- **Temuan (axe):** `landmark-no-duplicate-main`, `landmark-main-is-top-level`, dan `landmark-unique` di `/trips`, `/trips/new`, `/trips/generate`, serta semua tab trip (Itinerary, Map, Bookings, Budget, Summary). Layout punya `<main id="main-content">`, lalu tiap screen punya `<main>` lagi.
- **File:** `frontend/src/app/(dashboard)/layout.tsx:20`. Screen yang memakai `<main>`: `features/*/screens/*Screen.tsx` (Trips, NewTrip, GenerateTrip, Bookings, Itinerary, Budget, TripMap, Summary).
- **Langkah (sesuai K1 = layout saja):** ganti `<main>` di layout dengan `<div>`, dengan `id="main-content"` tetap ada supaya skip-link masih bekerja. Pastikan halaman yang screen-nya **tidak** punya `<main>` sendiri (`/currency`, `/profile`) tetap punya satu `<main>`. Jika tidak, tambahkan `<main>` di screen tersebut.
- **Selesai jika:** axe di semua halaman dashboard tidak lagi melaporkan `landmark-no-duplicate-main` dan `landmark-main-is-top-level`, setiap halaman punya tepat satu `<main>`, dan skip-link "Skip to content" melompat ke konten.

### U2 — Kontras `text-primary` di `/currency`

- **Temuan (axe, serius):** satu elemen `.text-primary` dengan warna #3672db punya rasio 4.25:1 (minimal 4.5:1 untuk teks normal). Elemennya belum dipastikan. Nilai besar konverter di `CurrencyConverter.tsx:136` memakai `text-primary-soft-foreground`, jadi bukan elemen itu. Dugaan: label tab aktif di nav mengambang (`text-primary` di atas `bg-primary-soft` #EAF2FF).
- **Langkah:** jalankan axe di `/currency` lalu catat selector lengkapnya. Ganti dengan `text-primary-soft-foreground` (#2E64C2, 5:1 di atas tint) jika teksnya ada di atas `primary-soft`. Jika komponennya dipakai bersama, cek juga halaman lain.
- **Selesai jika:** axe `color-contrast` bersih di `/currency` (light), tanpa regresi di halaman lain.

### U3 — Tabel `/privacy` tidak bisa difokus dengan keyboard

- **Temuan (axe, serius, 320px):** `scrollable-region-focusable` pada `.overflow-x-auto`.
- **File:** `frontend/src/app/privacy/page.tsx:28`.
- **Langkah:** tambahkan `tabIndex={0}`, `role="region"`, dan `aria-label` (misalnya "Third-party services") di div `overflow-x-auto`. Pastikan ada focus ring.
- **Selesai jika:** axe di 320px bersih, dan tabel bisa difokus dengan Tab lalu di-scroll dengan panah kiri/kanan.

### U4 — Urutan heading

- **Temuan (axe, moderate):** `heading-order`.
  - Itinerary: `features/activity/components/ActivityCard.tsx:75` memakai `<h4>` sesudah h2 (judul hari).
  - Budget: `features/expense/components/BudgetSummary.tsx:92` memakai `<h3 id="budget-spent-heading">` tanpa h2 di atasnya.
- **Langkah:** sesuaikan level heading dengan struktur halaman. Styling tetap lewat class, jadi tampilan tidak berubah.
- **Selesai jika:** axe `heading-order` bersih di Itinerary dan Budget, dan tampilan tidak berubah.

### U5 — Hero landing di mobile

- **Temuan (visual):** di 375px, paragraf hero dan teks "Free to use…" menimpa menara Tokyo (merah-putih) dan langit senja yang terang. Teks abu-abu "See it on the map." juga kurang kontras. Axe tidak bisa mengukur teks di atas gambar. Screenshot: `design-audit/ui-audit-2026-10-19/m_hero.png`.
- **File:** komponen hero di `frontend/src/components/landing/`.
- **Langkah (sesuai K2):** tambahkan scrim gradien gelap di belakang area teks, khusus breakpoint mobile. Desktop jangan diubah karena di sana sudah baik.
- **Selesai jika:** screenshot 375px dan 320px memperlihatkan teks yang jelas terbaca, kontras teks putih di atas area scrim minimal 4.5:1 (ukur dengan sampling piksel), dan desktop tidak berubah.

### U6 — Kartu login di mobile

- **Temuan:** di 375px, kartu login memanjang setinggi layar dan menyisakan ruang kosong besar di atas dan bawah. Screenshot: `mobile_login.png`.
- **File:** `frontend/src/app/(auth)/login/page.tsx`. Penyebabnya `min-h-dvh`, `flex-1`, dan `items-stretch` pada wrapper, ditambah `justify-center` pada section.
- **Langkah:** di bawah `lg`, jangan stretch kartunya (misalnya `items-center` atau tinggi otomatis). Layout desktop tetap.
- **Selesai jika:** di mobile kartu setinggi isinya dan posisinya di tengah, dan desktop tidak berubah.

### U7 — Pemilih bahasa di Summary

- **Temuan:** select "Indonesian" lebarnya 112px dengan padding kanan 16px, sehingga teks dan chevron berimpitan di mobile.
- **File:** `features/summary/` (komponen kontrol summary).
- **Langkah:** tambah lebar minimum atau padding kanan supaya chevron tidak menempel ke teks.
- **Selesai jika:** "Indonesian" dan "English" terlihat lega di 375px.

### U8 — Kartu fitur landing (desain)

- **Temuan:** di desktop, kartu "Each day on a map" dan "AI drafts you review" kosong di bagian bawah karena tingginya mengikuti kartu di sebelahnya. Kartu AI tidak punya preview sama sekali. Screenshot: `desktop_.png`.
- **Langkah:** buat mini-preview untuk kartu AI (misalnya bubble chat + daftar hari yang disarankan), sesuai gaya Soft di [DESIGN.md](DESIGN.md). Kartu peta boleh diberi garis rute sederhana. Tunjukkan mockup ke Ahmad dulu sebelum implementasi.
- **Selesai jika:** keempat kartu terlihat seimbang di desktop dan mobile, dan tidak ada hex baru di komponen (pakai token).

### U9 — Cover default untuk trip tanpa cover

- **Temuan:** trip tanpa cover (contoh: "Dream Tour Umrah") hanya tampil sebagai `bg-cover-fallback` (gradien navy kosong), sehingga terlihat seperti gambar yang belum termuat.
- **Catatan:** ini sudah direncanakan di PLANNING_REDESIGN_V2 (keputusan #8 dan fase V5: cover default di resolver). Kerjakan di sana. Task ini hanya penanda supaya tidak terlupa.

### U10 — Audit lanjutan

- Dashboard di desktop (≥1280px) belum diaudit.
- Dark mode (dipilih lewat toggle) belum diaudit di halaman mana pun.
- Jalankan axe dan cek visual yang sama, lalu tambahkan temuan baru sebagai U11 dan seterusnya di tracker.

---

## Cara verifikasi

- **Server lokal:** frontend :3000, backend :8090, Redis :6379. Biarkan tetap berjalan setelah test. Ingat: backend lokal memakai **DB prod**.
- **Halaman publik:** jalankan script Playwright + axe di `notes-local/ui-audit-public.mjs` (gitignored):
  `node notes-local/ui-audit-public.mjs D:/navisha/frontend <folder-output-screenshot>`.
  Script memakai `playwright` dan `@axe-core/playwright` dari `frontend/node_modules`, lalu mengecek 1440px, 375px, 320px, dan dark.
- **Dashboard:** butuh login. Minta Ahmad login di browser pane. **Jangan** memakai `/auth/test-login` atau helper `signIn` e2e, karena keduanya membuat user baru di DB prod.
  CSP memblokir axe dari CDN. Salin sementara `frontend/node_modules/axe-core/axe.min.js` ke `frontend/public/__axe.min.js`, muat lewat `<script src="/__axe.min.js">` di console, jalankan `axe.run(document, { runOnly: ["wcag2a","wcag2aa","wcag21aa","wcag22aa","best-practice"] })`, lalu **hapus file itu** setelah selesai.
- Sertakan screenshot sebelum/sesudah di PR untuk perubahan visual (U5–U8).

## Log progres

| Tanggal | Task | Catatan |
|---|---|---|
| 2026-10-19 | — | Audit selesai, plan disusun. K1–K3 diputuskan sesuai rekomendasi. Berikutnya: U1. |
