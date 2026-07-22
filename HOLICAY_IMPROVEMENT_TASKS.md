# Holicay-Inspired Improvement Tasks

Backlog baru hasil eksplorasi Holicay. Dokumen ini sengaja dipisahkan dari `WORKLOG.md` dan backlog lama Navisha.

## Form UX — prioritas awal

- [x] **FORM-01 — Unified travel date field (P1)**: gabungkan start date dan end date sebagai satu blok `Travel dates`, tampilkan durasi realtime, validasi rentang sebelum submit, dan pertahankan auto-open end date.
- [x] **FORM-02 — Destination autocomplete polish (P1)**: tampilkan format `City, Country`, highlight query, loading/empty state, tombol clear, Escape-to-close, keyboard navigation, dan simpan lokasi setelah suggestion dipilih.
- [x] **FORM-03 — AI toggle pada trip form (P1)**: tambahkan pilihan `Generate a draft with AI` di bawah destination/date sehingga manual dan AI menjadi satu flow.
- [x] **FORM-04 — Consistent field states (P1)**: samakan label, helper text, focus state, error message, disabled state, dan required marker di Trip, Expense, Stay, Activity, dan Transportation forms.
- [x] **FORM-05 — Progressive disclosure transportation form (P2)**: tampilkan field inti terlebih dahulu; pindahkan operator, reference number, notes, dan detail tambahan ke bagian `Additional details`.
- [x] **FORM-06 — Form accessibility pass (P1)**: pastikan semua input punya label terhubung, selector chip memakai `aria-pressed`, error memakai `aria-describedby`, dan suggestion list mendukung keyboard.

## Detailed form patterns from Holicay

- [x] **FORM-07 - Context-first add activity flow (P1)**: gunakan destinasi dan hari aktif sebagai default saat menambah aktivitas sehingga user tidak perlu memilih ulang konteks trip.
- [ ] **FORM-08 - Activity type selector (P1)**: pisahkan alur tambah item berdasarkan tipe `Place`, `Food`, `Stay`, `Transportation`, dan `Experience`, lalu tampilkan field yang relevan saja.
- [ ] **FORM-09 - Search-first with manual fallback (P1)**: sediakan pencarian lokasi sebagai jalur utama dan tombol `Add manually` jika lokasi tidak ditemukan.
- [ ] **FORM-10 - Custom activity form essentials (P1)**: dukung nama, alamat, hari, jam mulai, durasi, catatan, dan biaya opsional untuk aktivitas manual. **Progress:** duration UX selesai (quick duration, end-time otomatis, ringkasan, validasi, dan durasi pada kartu itinerary); input manual dan biaya masih ditunda.
- [ ] **FORM-11 - Advanced activity details (P2)**: pindahkan external link, attachment, booking reference, dan detail tambahan ke bagian `Advanced options` agar form utama tetap ringkas.
- [ ] **FORM-12 - Smart activity filters (P2)**: tambahkan filter ringan seperti `Popular`, `Nearby`, `Recommended`, dan `Budget-friendly` pada hasil pencarian tempat.
- [x] **FORM-13 - Actionable disabled states (P1)**: tampilkan alasan ketika aksi belum tersedia; diterapkan pada penyimpanan detail trip dan budget untuk menjelaskan field yang masih perlu dilengkapi.
- [ ] **FORM-14 - Inline day title editing (P2)**: izinkan judul hari diedit langsung dari itinerary tanpa membuka modal terpisah.
- [x] **FORM-15 - Transportation schedule UX (P1)**: kelompokkan departure/arrival dalam satu schedule card, jadikan arrival opsional, tambahkan default, shortcut `Same day`/`+1 day`, durasi otomatis, dan validasi urutan waktu.

## Trip planning

- [ ] **PLAN-01 — Itinerary/map split view (P1)**: tampilkan daftar itinerary dan map secara bersamaan pada desktop; klik item memfokuskan pin terkait.
- [ ] **PLAN-02 — Reorder activity (P1)**: dukung drag/reorder aktivitas dalam satu hari dan pindah aktivitas antar-hari dengan optimistic UI.
- [ ] **PLAN-03 — Map category filters (P2)**: filter Places, Stays, Food, Transport, dan Experiences tanpa menghilangkan konteks itinerary.
- [ ] **PLAN-04 — Route summary (P2)**: tampilkan estimasi jarak/waktu antar aktivitas dan indikator hari yang terlalu padat. **Progress:** peringatan jadwal overlap selesai untuk aktivitas dengan rentang waktu valid; estimasi perjalanan dan kepadatan hari masih ditunda.
- [ ] **PLAN-05 — Shareable read-only itinerary (P1)**: buat link publik read-only untuk dibagikan ke tripmates tanpa login.

## AI trip assistant

- [ ] **AI-01 — Regenerate one day (P1)**: regenerate hanya hari yang dipilih tanpa membuat ulang seluruh trip.
- [ ] **AI-02 — Edit intent actions (P1)**: dukung prompt seperti `buat lebih murah`, `kurangi perjalanan`, `tambah aktivitas foodie`, dan `ganti aktivitas ini`.
- [ ] **AI-03 — Add recommendation directly to itinerary (P1)**: setiap rekomendasi AI memiliki CTA untuk menambahkan item ke hari tertentu.
- [ ] **AI-04 — Nearby recommendations (P2)**: rekomendasikan tempat berdasarkan aktivitas yang sudah ada dan jarak geografis.

## Group trip dan budget

- [ ] **GROUP-01 — Tripmates dasar (P1)**: invite user, role owner/editor/viewer, dan daftar anggota trip.
- [ ] **GROUP-02 — Expense payer dan participants (P1)**: catat siapa yang membayar dan siapa yang ikut dalam expense.
- [ ] **GROUP-03 — Flexible expense split (P1)**: equal, custom amount, dan percentage split.
- [ ] **GROUP-04 — Settlement summary (P1)**: tampilkan `you owe`, `you are owed`, pihak yang harus membayar, dan status `Mark as paid`.
- [ ] **GROUP-05 — Receipt attachment (P2)**: upload receipt pada expense dengan preview dan batas ukuran file.

## Export dan utility

- [ ] **UTIL-01 — Export trip to PDF (P1)**: export itinerary, dates, activities, transportation, stay, dan budget summary ke PDF yang mudah dicetak.
- [ ] **UTIL-02 — Export locations to Google Maps (P2)**: kirim daftar lokasi trip ke Google Maps tanpa copy-paste manual.
- [ ] **UTIL-03 — Offline-friendly trip view (P2)**: cache itinerary inti agar tetap dapat dibaca saat koneksi buruk.
- [ ] **UTIL-04 — Trip reminders (P2)**: countdown, aktivitas hari ini, dan pengingat booking/transport.

## Discovery dan monetisasi

- [ ] **DISC-01 — Public itinerary template (P2)**: publish itinerary, preview, dan `Use this itinerary`.
- [ ] **DISC-02 — Clone itinerary (P2)**: salin itinerary publik ke trip pengguna lalu ubah tanggal/aktivitas.
- [ ] **DISC-03 — Template filters (P3)**: filter berdasarkan destination, duration, budget, travel style, dan solo/group.
- [ ] **DISC-04 — Creator profile and ratings (P3)**: profile creator, rating, review, dan bookmark.
- [ ] **DISC-05 — Premium itinerary marketplace (P3)**: payment, refund, payout, moderation, dan revenue sharing.

## Deliberately deferred

- [ ] **DEFER-01 — Gmail/Outlook booking sync**: kompleksitas OAuth, privacy, parsing provider, dan data retention terlalu besar untuk tahap awal.
- [ ] **DEFER-02 — Live flight tracker**: membutuhkan API eksternal, biaya, coverage, dan mekanisme alert.
- [ ] **DEFER-03 — Member discounts/booking marketplace**: membutuhkan partnership, inventory, payment, refund, dan customer support.

## Recommended first slice

Kerjakan dalam urutan kecil berikut: **FORM-02 → FORM-01 → FORM-03 → FORM-04**. Setelah form flow stabil, lanjutkan ke **GROUP-02 → GROUP-03 → GROUP-04**.
