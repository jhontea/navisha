# Planning — Perbaikan Hasil Audit UI (2026-10-19)

> **Tanggal audit:** 2026-10-19
> **Status:** U1–U8, U10 dan U11 selesai (2026-10-19). U9 menunggu fase V5. U12 dan U13 (audit alur buat trip baru) selesai (2026-10-19). U14–U19 masih `todo`. Lihat [Tracker](#tracker-progres).
> **Konteks:** Audit memakai rubrik plugin `ux-ui-agent-skills` (design-review + a11y-audit: WCAG 2.2 AA, heuristik Nielsen) ditambah axe-core dan cek visual. Halaman publik diaudit di 1440px, 375px, dan 320px. Dashboard diaudit di layout mobile 457px dengan data asli.
> Screenshot audit ada di `design-audit/ui-audit-2026-10-19/` (gitignored).
> **Catatan:** audit dijalankan terhadap checkout lokal saat itu (branch `chore/ci-hardening`), bukan `main` terbaru. Konfirmasi ulang setiap temuan di `main` terbaru sebelum diperbaiki.

## Cara memakai dokumen ini (untuk sesi baru)

1. Baca bagian **Tracker** dan ambil task pertama yang statusnya `todo` (ikuti urutan, kecuali diminta lain).
2. Baca detail task-nya di bagian **Task**: file, langkah, dan kriteria selesai.
3. Jelaskan rencananya ke Ahmad dan tunggu persetujuan sebelum mengubah kode. Perbaikan kecil boleh langsung dikerjakan, lalu laporkan file dan baris yang berubah. Task desain (visual) selalu ditunjukkan pratinjaunya dulu.
4. **Selalu mulai dari `main` terbaru** ("master" = `origin/main`). Jalankan `git fetch origin`, lalu buat branch dari `origin/main` dengan nama yang tertulis di task (sebaiknya lewat worktree, karena checkout utama dipakai bersama dan branch-nya bisa berganti). Sebelum memperbaiki, pastikan temuannya masih ada di kode `main`, dan pastikan server lokal yang dipakai untuk verifikasi menjalankan kode branch task. Satu task = satu branch = satu PR. Claude yang commit, push, membuat PR, dan merge setelah check CI lulus.
5. Verifikasi di runtime (lihat **Cara verifikasi**), jangan hanya mengandalkan unit test.
6. Setelah selesai, perbarui baris task di **Tracker** (status, branch/PR, tanggal) dan tambahkan catatan singkat di **Log progres**. Perubahan dokumen ini ikut di-commit di branch task yang sama.

Status: `todo` → `in progress` → `review` (PR dibuka) → `done` (merge). Pakai `skip` jika task dibatalkan, dan tulis alasannya di log.

## Tracker progres

| ID | Tingkat | Ringkasan | Branch | Status | PR / tanggal |
|---|---|---|---|---|---|
| U1 | Sedang (semua halaman dashboard) | `<main>` bersarang dan duplikat | `fix/a11y-main-landmark` | done | #102 · 2026-10-19 |
| U2 | Serius | Kontras `text-primary` 4.25:1 di `/currency` | `fix/a11y-primary-contrast` | done | #103 · 2026-10-19 |
| U3 | Serius | Tabel `/privacy` tidak bisa difokus dengan keyboard (320px) | `fix/a11y-privacy-table` | done | #104 · 2026-10-19 |
| U4 | Minor | Urutan heading melompat (Itinerary, Budget) | `fix/a11y-heading-order` | done | #105 · 2026-10-19 |
| U5 | Serius (visual) | Teks hero landing menimpa ilustrasi di mobile | `fix/landing-hero-mobile` | done | #106 · 2026-10-19 |
| U6 | Minor | Kartu login di mobile terlalu tinggi | `fix/login-card-mobile` | done | #107 · 2026-10-19 |
| U7 | Minor | Pemilih bahasa di Summary sempit | `fix/summary-language-select` | done | #108 · 2026-10-19 |
| U8 | Minor (desain) | Kartu fitur landing kosong di bagian bawah | `feat/landing-feature-previews` | done | #109 · 2026-10-19 |
| U9 | Minor (desain) | Trip tanpa cover hanya berupa gradien kosong | (ikut V5 redesign) | todo | |
| U10 | Audit | Audit lanjutan: dashboard desktop + dark mode | — | done | 2026-10-19 (temuan: U11) |
| U11 | Sedang (tab trip, desktop) | Header trip menjadi landmark banner kedua | `fix/a11y-trip-header-banner` | done | #110 · 2026-10-19 |
| U12 | Sedang (UX) | Switch AI di form "from scratch" diganti link | `fix/new-trip-ai-link` | done | #113 · 2026-10-19 |
| U13 | Sedang | Rapikan form trip: label tanggal, urutan currency/budget, refactor | `fix/trip-form-polish` | done | #114, #115 · 2026-10-19 |
| U14 | Sedang (UX) | "Review location" fokus ke lokasi + Title terisi otomatis | `fix/activity-location-review` | todo | |
| U15 | Sedang | Field destinasi tetap bisa dipakai saat Google Places gagal | `fix/destination-places-fallback` | todo | |
| U16 | Minor | Kalender: tanggal lampau redup, rentang trip ditandai | `fix/date-picker-past-days` | todo | |
| U17 | Minor | Chip durasi tersorot + biaya tampil di kartu stay | `fix/duration-chip-stay-cost` | todo | |
| U18 | Refactor | Form uang lain memakai `formatAmountInput` | `refactor/amount-input-format` | todo | |
| U19 | Sedang (data) | Budget desimal berubah saat Edit → Save trip | `fix/trip-budget-decimals` | todo | |

## Keputusan

| # | Pertanyaan | Rekomendasi | Keputusan |
|---|---|---|---|
| K1 | U1: ubah layout saja, atau rapikan tiap screen? | Ubah layout saja (1 file) | Setuju — ubah layout saja (2026-10-19) |
| K2 | U5: scrim gelap, atau atur ulang posisi ilustrasi? | Scrim gradien di mobile | Setuju — scrim gradien di mobile (2026-10-19) |
| K3 | U8 dan U9 dikerjakan sekarang atau masuk backlog? | U8 sekarang (setelah U1–U7); U9 ikut V5 di [PLANNING_REDESIGN_V2.md](PLANNING_REDESIGN_V2.md) | Setuju — U8 setelah U1–U7, U9 ikut V5 (2026-10-19) |
| K4 | U12: switch AI di form "from scratch"? | Ganti link kecil di bawah tanggal | Setuju — link kecil (2026-10-19) |
| K5 | U14: kurangi ketik ganda Title + Location? | Title terisi otomatis dari tempat yang dipilih jika masih kosong | Setuju — auto-isi (2026-10-19) |
| K6 | U16: tanggal lampau boleh dipilih? | Boleh, tapi diredupkan | Setuju — boleh, redup (2026-10-19) |
| K7 | Alur kerja U12–U17? | Satu task per PR, berurutan; planning me-review sebelum merge | Setuju (2026-10-19) |

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
- **Hasil (2026-10-19):** halaman publik (1440 light, 1440 dark, 375 dark) dan 10 halaman dashboard (1440 light dan dark) bersih, kecuali U11. Dark dipilih lewat cookie `navisha-theme=dark`, karena aplikasi mengabaikan `prefers-color-scheme`.

### U11 — Header trip menjadi banner kedua

- **Temuan (axe, moderate, desktop):** `landmark-no-duplicate-banner` dan `landmark-unique` di semua tab trip. Sejak U1, `<header>` di `TripHeader` berada di luar `<main>`, sehingga menjadi banner kedua di samping NavBar. Di mobile tidak muncul karena NavBar atas tersembunyi.
- **Perbaikan:** `<header>` diganti `<section aria-label="Trip details">`. Kalau memakai `<div>`, axe melaporkan `region`.

### Audit alur "buat trip baru" (2026-10-19)

Dijalankan di `main` 4d4a1f1 dengan layout mobile 457px dan desktop 1440px. Trip uji "Weekend di Bandung" (24–25 Okt 2026, budget Rp 1.500.000) dibuat lewat UI, lalu diisi 2 aktivitas lokasi, 1 stay (Rp 650.000 menjadi expense), dan dicek di tab Itinerary, Map, Bookings, Budget, serta daftar Trips. Semuanya tersimpan dan tampil dengan benar. U12–U17 adalah perbaikan tampilan dan UX dari audit itu.

Badge "Review location" sempat muncul karena audit awalnya dijalankan di :3001, yang ditolak API key Google Maps (`RefererNotAllowedMapError`). Akibatnya tidak ada saran tempat dan lokasi disimpan tanpa lat/lng (`activityFormValues.ts:136`, `needs_review`). Di :3000 saran muncul dan lokasi terverifikasi. **Verifikasi apa pun yang memakai Google Places wajib di :3000.**

### U12 — Switch AI di form "from scratch" diganti link

- **Temuan:** di halaman "New trip from scratch" ada switch "Generate a draft with AI". Kalau dinyalakan, Budget, Base currency, dan tombol Create/Cancel hilang, lalu muncul tombol "Continue with AI" yang berpindah halaman. Masalahnya: `role="switch"` dipakai untuk mengganti mode dan navigasi, Title yang wajib diisi dibuang, dan jalur ini dobel dengan dropdown "New trip" di `/trips` (`TripCTAs`).
- **File:** `frontend/src/features/trip/components/TripForm.tsx:251-310` (switch dan panel), `:312-396` (blok yang disembunyikan), state `generateWithAI` di `:83`.
- **Langkah (K4):** hapus switch, panel, dan state `generateWithAI`, sehingga field dan tombol form selalu tampil. Di bawah field Travel dates (hanya saat membuat trip, `!initial`), tambahkan satu baris teks kecil "Prefer an AI draft?" dengan `Button variant="link"` "Generate with AI" + ikon `Sparkles` yang memanggil `continueWithAI()` (destinasi, tanggal, dan currency tetap terbawa lewat query string).
- **Selesai jika:** form punya satu jalur submit, link membawa destinasi dan tanggal ke `/trips/generate`, form edit trip tidak menampilkan link itu, dan axe `/trips/new` bersih.

### U13 — Rapikan form trip (setelah U12)

- **Temuan:**
  1. Travel dates hanya punya `legend` sr-only. Field lain memakai `FormFieldLabel` di atas field dengan tanda wajib atau "(optional)".
  2. Budget muncul sebelum Base currency, dengan ikon kartu kredit dan format `Number(raw).toLocaleString()` tanpa locale (bergantung pada browser). Form stay sudah memakai pola yang lebih baik: angka + pilihan mata uang di sebelahnya.
  3. Refactor: `style={{ borderColor }}` di `:162` dan `:318` melanggar aturan "Tailwind only"; markup input-group (ikon + pemisah + input tanpa border) ditulis dua kali; indentasi isi `<fieldset>` dan fragment berantakan; `notes` ada di schema tapi tidak punya field.
- **File:** `TripForm.tsx`, `TravelDateRangePicker.tsx` (prop `label`).
- **Langkah:**
  1. Tampilkan label "Travel dates" terlihat dengan gaya `FormFieldLabel` + tanda wajib, dan hubungkan ke tombol picker.
  2. Pindahkan Base currency ke atas Budget. Prefix Budget menampilkan kode mata uang yang dipilih (`useWatch("base_currency")`), bukan ikon kartu. Format angka memakai locale yang sama dengan helper format uang di `lib/utils.ts`/`lib/currency.ts`.
  3. Ganti inline style dengan class (`aria-invalid:` atau `cn()`), satukan input-group menjadi satu komponen kecil (cek dulu apakah sudah ada pola yang sama di form stay/expense dan pakai itu), rapikan indentasi, dan beri komentar satu baris kenapa `notes` diteruskan tanpa field (atau hapus jika tidak dipakai di edit).
- **Selesai jika:** kelima field punya label dengan gaya yang sama, mengganti currency langsung mengubah prefix Budget, format angka sama dengan halaman Budget, tidak ada `style=` di `TripForm.tsx`, lint/typecheck/vitest lulus, dan screenshot sebelum/sesudah disertakan di PR.

### U14 — "Review location" dan Title otomatis

- **File:** `features/activity/components/ActivityCard.tsx:107-117` (tombol) → `SortableActivityRow.tsx:84` → `DayActivities.tsx:238` (`setSheet({ mode: "edit", activity })`) → sheet edit `DayActivities.tsx:318-340` → `ActivityForm.tsx:31-45` (props, belum ada prop fokus). Field: Title `ActivityForm.tsx:93`, Location name `form/LocationFields.tsx:151`, handler pilih tempat `LocationFields.tsx:173` (`onPlaceSelect`). `setFocus` RHF sudah dipakai di `LocationFields.tsx:50`/`:135`.
- **Temuan:** (1) Tombol "Review location" membuka form edit biasa dengan fokus di Title, tanpa penjelasan apa yang harus diperbaiki. (2) Di aktivitas lokasi, nama tempat diketik dua kali (Title dan Location name).
- **Langkah (K5):** (1) Tambah state sheet kecil (misalnya `{ mode: "edit", activity, focus: "location" }`) dari tombol "Review location", teruskan ke `ActivityForm` sebagai satu prop opsional, lalu `setFocus("location_name")` saat mount. Tampilkan hint di bawah field lokasi selama lokasinya `needs_review`: "Pick a place from the suggestions to pin it on the map." (2) Di `onPlaceSelect` (`LocationFields.tsx:173`), jika Title masih kosong, isi Title dengan nama tempat. Title yang sudah diisi tidak ditimpa.
- **Selesai jika:** di :3000, klik "Review location" langsung fokus ke lokasi dengan hint; memilih tempat lalu menyimpan menghilangkan badge; Title kosong terisi otomatis, Title yang sudah ada tetap.

### U15 — Field destinasi saat Google Places gagal

- **Temuan:** jika Places gagal (key ditolak, kuota habis, atau adblock), Google menambahkan class `gm-err-autocomplete`, men-*disable* input, dan mengganti placeholder menjadi "Oops! Something went wrong." dengan ikon "!" kecil. User tidak tahu sebabnya dan tidak bisa mengetik lagi. Form aktivitas sudah tetap tersimpan (`needs_review`), tapi field destinasi di form trip mati.
- **File:** `frontend/src/features/location/provider/google.tsx` (`DestinationAutocompleteInput`, sekitar baris 117-175).
- **Langkah:** deteksi kegagalan (`window.gm_authFailure` dan/atau class `gm-err-autocomplete` setelah widget dibuat). Jika gagal, lepaskan widget dan render `Input` biasa (teks bebas) dengan hint "Location suggestions are unavailable. Type the destination." Cek apakah pencarian tempat di form aktivitas dan stay memakai jalur yang sama; jika ya, terapkan perilaku yang sama.
- **Selesai jika:** dengan key ditolak (misalnya frontend sementara di :3001), field tetap bisa diketik, hint tampil, dan trip tersimpan dengan destinasinya. Di :3000 autocomplete tetap berjalan normal.

### U16 — Kalender: tanggal lampau dan rentang trip

- **File:** `features/trip/components/TravelDateRangePicker.tsx`: props `:18-28` (ada `defaultMonth`, belum ada min/max atau rentang trip), sel tanggal `:190-229`, `isToday` `:195`, titik hari ini `:225-227`. Form stay: `features/accommodation/components/AccommodationForm.tsx:281` (`defaultMonth={defaultDate}`), `AccommodationSection.tsx:128`/`:144` (`defaultDate={tripStart}`).
- **Temuan:** (1) tanggal sebelum hari ini tampil sama persis dengan tanggal mendatang. (2) Di form stay, kalender tidak menandai rentang tanggal trip, sehingga user harus ingat sendiri tanggal trip-nya.
- **Langkah (K6):** (1) Tanggal sebelum hari ini memakai `text-muted-foreground`, tetapi tetap bisa dipilih. (2) Tambah satu prop opsional `highlightRange: { start, end }` di picker, isi dari `AccommodationSection` (tanggal mulai dan akhir trip), lalu tandai tanggal trip dengan latar `bg-primary-soft` tipis dan buka kalender di bulan mulai trip.
- **Selesai jika:** tanggal lampau terlihat redup, rentang trip terlihat di picker stay, navigasi keyboard tetap berjalan, dan axe `color-contrast` bersih (tanggal redup tetap ≥ 4.5:1).

### U17 — Chip durasi dan biaya di kartu stay

- **File:** chip durasi `features/activity/components/form/LocationFields.tsx:16-20` (preset), `:117-139` (render), `:126` (`pressed={durationMinutes === duration.minutes}`), `:55` (`durationMinutes`); gaya `components/Chip.tsx:27-51`. Kartu stay `features/accommodation/components/AccommodationCard.tsx:31-36` (props), `:39-51` (facts), `:70-82` (check-in/out). Biaya stay = expense terkait: `AccommodationSection.tsx:47` (`useExpenses`) dan `:143` (`linkedCost(...)`, sekarang hanya untuk form edit).
- **Temuan:** (1) jam 09:00–11:00 menghasilkan "2h", tapi chip "2 hours" tidak terlihat tersorot. Logika `pressed` sudah ada, jadi penyebabnya belum pasti: bisa gaya `pressed` yang kurang kontras, atau nilai `end_time` yang tidak memicu hitung ulang. Saat audit, jam diisi lewat otomasi, bukan diketik. (2) Kartu stay di Bookings tidak menampilkan biaya, padahal biayanya tercatat sebagai expense (Rp 650.000).
- **Langkah:** (1) Reproduksi dulu di :3000 dengan mengetik jam secara manual, lalu cek `aria-pressed` pada chip. Jika `true` tapi tampak tidak aktif, perbaiki kontras gaya `pressed` di `Chip.tsx`. Jika `false`, perbaiki hitungan di `LocationFields.tsx`. Jika tidak bisa direproduksi, tulis di log lalu `skip` bagian ini. (2) Di `AccommodationSection`, ambil biaya tiap stay dengan `linkedCost(expenses, "accommodation", id)`, teruskan ke `AccommodationCard` lewat satu prop opsional `cost`, dan tampilkan sebagai fact "Cost" dengan helper format uang yang sudah ada.
- **Selesai jika:** chip yang sesuai tersorot saat jam diisi manual, dan kartu stay menampilkan biaya. Stay tanpa biaya tetap tampil seperti sekarang.

### U18 — Format angka uang di form lain

- **Temuan:** logika "buang non-angka lalu `toLocaleString()` tanpa locale" ditulis ulang di form stay (`features/accommodation/components/AccommodationForm.tsx:380-387`), expense (`features/expense/components/ExpenseForm.tsx:91` dan onChange amount), converter (`features/currency/components/CurrencyConverter.tsx`), AI wizard (`features/trip/components/GenerateChatWizard.tsx`), dan share dialog (`features/trip/components/TripShareDialog.tsx`). Karena tanpa locale, hasilnya bergantung pada browser. U13 sudah membuat `formatAmountInput` (`lib/money.ts`, dengan test) dan memakainya di form trip.
- **Langkah:** periksa tiap tempat. Untuk input uang bilangan bulat, ganti dengan `formatAmountInput`. Form stay dan expense menerima desimal (`replace(/[^0-9.]/g, "")`), jadi perluas helper dengan opsi desimal atau buat helper kedua, lalu tambahkan test-nya. Untuk angka yang bukan input uang (misalnya di share dialog), cukup beri locale `"en-US"`.
- **Selesai jika:** tidak ada lagi `toLocaleString()` tanpa argumen di `src/`, angka di form stay, expense, dan converter tampil "1,500,000", nilai yang tersimpan tidak berubah (cek Edit → Save pada data uji), dan regresi form stay serta expense dicek di :3000.

### U19 — Budget desimal berubah saat Edit → Save

- **Temuan:** budget trip disimpan sebagai `NUMERIC(14,4)` (`backend/migrations/003_add_trip_budget.sql`; `backend/internal/trip/model.go:14` memakai `float64`), tetapi form trip hanya menerima digit. `setValueAs` dan `formatAmountInput` membuang titik desimal, sehingga budget `1500.50` tampil "150,050" di form Edit dan tersimpan sebagai `150050` saat Save. Bug ini sudah ada sebelum U13. Budget yang diketik lewat form selalu bilangan bulat, jadi kasus ini hanya muncul dari jalur lain (API, AI draft, atau data lama).
- **Langkah:** (1) Cek dulu di DB prod secara read-only (`SELECT count(*) FROM trips WHERE budget <> trunc(budget)`) apakah ada budget desimal. (2) Putuskan bersama Ahmad: budget selalu bilangan bulat (dibulatkan di backend dan didokumentasikan), atau form menerima desimal sesuai `currencyDecimals` (`lib/money.ts:7`). (3) Terapkan, lalu tambahkan test untuk nilai desimal.
- **Selesai jika:** Edit → Save tidak pernah mengubah nilai budget, termasuk yang desimal, dan ada test untuk kasus itu.

---

## Cara verifikasi

- **Server lokal:** frontend :3000, backend :8090, Redis :6379. Biarkan tetap berjalan setelah test. Worktree baru perlu `npm ci` dan salinan `frontend/.env.local`. Port lain (misalnya :3001) hanya cocok untuk halaman tanpa Google Places, karena API key Maps hanya mengizinkan :3000. Untuk U12–U17, hentikan sebentar frontend :3000, jalankan frontend worktree di :3000, lalu kembalikan frontend `D:\navisha` ke :3000 setelah selesai.
- **Halaman publik:** jalankan script Playwright + axe di `notes-local/ui-audit-public.mjs` (gitignored):
  `node notes-local/ui-audit-public.mjs <folder-frontend> <folder-output-screenshot>`.
  Script memakai `playwright` dan `@axe-core/playwright` dari `frontend/node_modules`, lalu mengecek 1440px, 375px, 320px, dan dark.
- **Dashboard:** butuh login. Minta Ahmad login di browser pane. **Jangan** memakai `/auth/test-login` atau helper `signIn` e2e untuk audit, karena keduanya membuat user uji baru.
  CSP memblokir axe dari CDN. Salin sementara `frontend/node_modules/axe-core/axe.min.js` ke `frontend/public/__axe.min.js`, muat lewat `<script src="/__axe.min.js">` di console, jalankan `axe.run(document, { runOnly: ["wcag2a","wcag2aa","wcag21aa","wcag22aa","best-practice"] })`, lalu **hapus file itu** setelah selesai.
- Sertakan screenshot sebelum/sesudah di PR untuk perubahan visual (U5–U8).

## Log progres

| Tanggal | Task | Catatan |
|---|---|---|
| 2026-10-19 | — | Audit selesai, plan disusun. K1–K3 diputuskan sesuai rekomendasi. Berikutnya: U1. |
| 2026-10-19 | U1 | Layout `<main>` → `<div>`; `/currency` dan Profile punya `<main>` sendiri; nav mobile diberi label "Bottom navigation". |
| 2026-10-19 | U2 | Elemennya tombol "Clear all" (`Button variant="link"`, 4.22:1 di atas background). Variant `link` → `text-primary-soft-foreground` (5.25:1). |
| 2026-10-19 | U3 | Wrapper tabel: `tabIndex={0}`, `role="region"`, `aria-label`, focus ring. Diuji Tab + panah di 320px. |
| 2026-10-19 | U4 | ActivityCard `h4` → `h3`; BudgetSummary `h3` → `h2`. Tampilan tetap. |
| 2026-10-19 | U5 | Scrim `bg-linear-to-b from-black/50 via-black/60 to-black/65 lg:hidden`. Kontras terburuk per piksel ≥ 5.1:1 di 320/375px; desktop tetap. |
| 2026-10-19 | U6 | Grid login `items-center lg:items-stretch`; kartu 375px 680 → 404px. |
| 2026-10-19 | U7 | `NativeSelect` `px-4` → `pl-4 pr-10` (berlaku untuk semua select). |
| 2026-10-19 | U8 | Preview AI baru, rute pada kartu peta, rincian kategori pada budget, panel `flex-1`. |
| 2026-10-19 | U10, U11 | Audit desktop + dark selesai; satu temuan (U11) diperbaiki. |
| 2026-10-19 | U12–U17 | Audit alur buat trip baru di `main` 4d4a1f1; enam task baru. K4–K7 diputuskan sesuai rekomendasi. Berikutnya: U12. |
| 2026-10-19 | U12 | Switch AI diganti link "Generate with AI" (#113). |
| 2026-10-19 | U13 | Label tanggal, currency di atas budget dengan prefix simbol, `InputGroup`, `formatAmountInput` + test (#114); nilai awal budget di Edit diformat (#115). Regresi form stay dan Edit → Save trip uji sudah dicek. U18 dan U19 ditambahkan dari temuan review. Berikutnya: bahas U14. |
