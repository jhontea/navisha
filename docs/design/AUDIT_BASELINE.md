# Audit Visual — Baseline (D0)

> **Tanggal:** 2026-10-13
> **Cara:** setiap halaman dibuka di browser pada lebar **390px** (mobile) dan **1440px** (desktop), lalu diukur otomatis dengan skrip di halaman (ukuran font yang ter-render, elemen blur/gradient, ukuran target sentuh, overflow horizontal).
> **Screenshot:** disimpan lokal di `design-audit/baseline/` (di-gitignore karena berisi data trip asli). Dokumen ini hanya berisi temuan.
> **Acuan:** fase D0 di [PLANNING_REFACTOR_REDESIGN.md](../PLANNING_REFACTOR_REDESIGN.md).

## 1. Angka per halaman (mobile 390px)

| Halaman | Teks < 12px | Blur | Gradient | Gradient di teks | Target sentuh < 44px |
|---|---|---|---|---|---|
| Landing `/` | 39 (termasuk 9px) | 11 | 14 | 3 | 8 / 11 |
| Dashboard | 5 | 10 | 6 | 1 | 3 / 12 |
| My Trips | 26 | 14 | 7 | 1 | 10 / 19 |
| Trip · Overview | 11 | 11 | 5 | 0 | 14 / 25 |
| Trip · Itinerary | 19 | 18 | 12 | 0 | **64 / 74** |
| Trip · Transport | 33 | 8 | 3 | 0 | 15 / 25 |
| Trip · Stay | 13 | 8 | 3 | 0 | 9 / 19 |
| Trip · Budget | **85** (80 di antaranya 10px) | **23** | 3 | 0 | **188 / 199** |
| New Trip | 6 | 2 | 2 | 0 | 5 / 15 |
| Generate (AI) | 4 | 2 | 4 | 0 | 4 / 9 |
| Currency | 4 | 4 | 2 | 0 | 15 / 20 |
| Profile | 6 | 8 | 3 | 0 | 3 / 11 |

Tidak ada halaman yang overflow horizontal di 390px.

**Kesimpulan angka:**
- Teks 10–11px ada di semua halaman; Budget paling parah. Target: tidak ada teks < 12px, body ≥ 14px.
- Blur dipakai di semua halaman (8–23 elemen). Target: hanya bar sticky.
- Hampir semua tombol/link di Itinerary dan Budget lebih kecil dari 44px, sulit disentuh di HP.

## 2. Temuan visual & UX

### Global
1. **Navigasi bertumpuk di dalam trip (mobile):** hero besar + tab trip + bottom nav global. Bottom nav menandai "My Trips", tidak memberi konteks trip. Sesuai keputusan B3: tab trip menggantikan bottom nav.
2. **Widget bulat mengambang menutupi tab "Profile"** di bottom nav (pojok kanan bawah, semua halaman). Perlu dicek apakah hanya muncul di dev.
3. **Tombol utama selalu gradient** (biru→ungu→teal), termasuk tombol yang sedang disabled (Generate → Send).
4. **Ikon AI/sparkle muncul di banyak tempat** (dashboard 2×, new trip, generate), tidak hanya sebagai satu titik masuk AI.
5. **Desktop terasa seperti mobile yang direntangkan:** Itinerary dan Budget satu kolom (maks 1200px), list/map masih toggle, peta tidak berdampingan.

### Per halaman
| Halaman | Temuan |
|---|---|
| Landing | Judul memakai gradient teks; badge klaim "10,000+ trips planned this month"; copy slogan ("Own Every Moment"). |
| Dashboard | Saat semua trip sudah lewat, muncul kartu **"Welcome… plan your first trip"** seolah user baru. Statistik desktop menampilkan 0 trip/0 negara walaupun ada trip. |
| My Trips | Filter chip dan sort kecil; badge "Past" kontras rendah di atas foto. |
| Trip · Overview | Total uang IDR tampil dengan sen (`Rp 68,340,303.69`). Status trip yang sudah selesai tertulis **"Day 10 of 10 · in progress"**. 4 kartu statistik masing-masing berwarna latar berbeda. |
| Trip · Itinerary | Toggle List/Map gradient; kartu timeline memakai border kiri tebal + latar berwarna + badge; banyak teks 10px (label TRANSPORT/STAY, kode penerbangan). |
| Trip · Transport / Stay | Kotak besar bergaya *empty state* ("Log a transportation") selalu di atas, **daftar yang sudah ada terdorong ke bawah lipatan**, layar pertama terlihat kosong. Judul daftar "Upcoming Travel" juga dipakai untuk trip yang sudah lewat. |
| Trip · Budget | Ring persentase dekoratif; legenda kategori 10px; daftar expense sangat panjang (halaman ±7.900px di mobile) tanpa ringkasan per hari. |
| New Trip | Ikon dekoratif di judul; field "Travel dates" berbeda gaya dengan field lain. |
| Generate | Gradient di progress bar dan tombol; sisa kuota ("20/20 · resets 07.00 WIB") kecil. |
| Currency | **Bendera tampil sebagai huruf "US"/"ID"** di Windows (emoji bendera tidak didukung); judul gradient. |
| Profile | **Foto avatar gagal dimuat** (yang tampil teks nama); statistik "0 Trips Completed" walaupun ada trip yang sudah lewat; banner gradient dekoratif. |

## 3. Bug fungsional yang ikut ketemu (di luar desain)

Dicatat agar tidak hilang. Dikerjakan saat halaman terkait di-redesign (D4) atau sebagai fix terpisah.

| # | Bug | Halaman |
|---|---|---|
| F1 | Kartu "first trip" muncul untuk user yang punya trip, asal semuanya sudah lewat | Dashboard |
| F2 | Statistik trip (completed/upcoming/negara) menampilkan 0 | Dashboard, Profile |
| F3 | Status "in progress" untuk trip yang sudah selesai | Trip header/Overview |
| F4 | Format IDR menampilkan desimal | Overview, Budget |
| F5 | Daftar transport/stay tertutup kotak "add" | Transport, Stay |
| F6 | Avatar Google gagal dimuat | Profile, NavBar |
| F7 | Bendera currency tidak tampil di Windows | Currency, dropdown currency |

## 4. Prioritas untuk D1–D4

1. **D1 (fondasi):** skala teks minimum 12px, netralkan glass/gradient/shadow kembar, satu gaya tombol utama (solid).
2. **D2 (komponen):** Button/IconButton dengan target ≥ 44px, MoneyText (format per mata uang, tanpa sen untuk IDR/JPY/KRW/VND), StatTile netral, EmptyState yang tidak menutupi daftar.
3. **D3 (navigasi):** tab trip menggantikan bottom nav di dalam trip; header trip ringkas.
4. **D4 (halaman):** Itinerary split view → Budget → Trips home → Bookings → Share → Landing, sambil membereskan F1–F7.
