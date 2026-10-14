# Navisha — Design Foundation V2 · "Soft"

> **Status:** fondasi yang dipilih (2026-10-14). Arah: **Soft** dari ronde 4 eksplorasi.
> **Menggantikan:** [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) setelah fase V1 diterapkan. Aturan aksesibilitas, larangan hex di komponen, dan palet kategori expense dari dokumen lama tetap berlaku.
> **Acuan visual:** mockup `design-audit/v2-trip/index.html` (opsi Soft) · referensi user `design-audit/references/` · plan [PLANNING_REDESIGN_V2.md](PLANNING_REDESIGN_V2.md) · cover [design/COVER_PROMPTS.md](design/COVER_PROMPTS.md)

---

## 1. Konsep

**Lembut di bentuk, padat di isi.**

Navisha adalah teman perjalanan yang tenang. UI-nya terang dan membulat dengan tint biru yang lembut, sedangkan **cover ilustrasi senja menjadi satu-satunya bagian yang "berwarna penuh"**. Kontras antara UI pastel dan cover malam itulah karakter Navisha.

### Prinsip

1. **Cover adalah bintangnya.** UI tidak bersaing dengan cover: tanpa gradasi dekoratif, tanpa blok warna besar.
2. **Satu warna: biru.** Aksi utama berwarna biru solid. Status aktif memakai *tint* biru muda (bukan blok penuh). Hijau dan merah hanya untuk status, dan warna kategori hanya untuk data budget.
3. **Bulat dan lembut.** Tidak ada sudut tajam dan tidak ada garis tebal. Bayangan sangat tipis dengan nuansa biru.
4. **Padat tanpa terasa sesak.** Tanggal, jam, dan tiket langsung terlihat tanpa scroll. Jarak dikurangi dengan menyusun elemen berdampingan, bukan dengan memperkecil teks.
5. **Tenang.** Satu elemen menonjol per layar. Tidak ada animasi dekoratif.

---

## 2. Warna

Token adalah CSS variable di `globals.css` (format HSL seperti sekarang), dipetakan di `tailwind.config.ts`. Nama semantik lama (`background`, `card`, `primary`, `muted`, …) dipertahankan agar coss ui tetap jalan. Nama baru ditandai ✚.

### 2.1 Inti

| Token | Peran | Light | Dark | Kontras |
|---|---|---|---|---|
| `--background` | Latar halaman | `#F3F7FD` | `#121A2B` | |
| `--card` | Kartu, sheet, nav | `#FFFFFF` | `#1A2438` | |
| `--muted` | Permukaan sekunder (lingkaran tanggal, fact box, input) | `#F1F5FC` | `#212D45` | |
| `--foreground` | Teks utama | `#23324D` | `#E6ECF7` | 12.0 / 13.1 |
| `--muted-foreground` | Teks sekunder | `#5F6B82` | `#A3AFC5` | 5.0 / 7.9 |
| `--border` | Garis halus | `#E6EDF7` | `#2A3650` | |
| `--primary` | Tombol utama, link, pin aktif | `#3673DB` | `#86B2FF` | |
| `--primary-foreground` | Teks di atas primary | `#FFFFFF` | `#0E1626` | 4.5 / 8.5 |
| ✚ `--primary-soft` | Tint untuk state aktif (tab, tanggal, nav, pill jam) | `#EAF2FF` | `#1F3254` | |
| ✚ `--primary-soft-foreground` | Teks di atas tint | `#2E64C2` | `#BCD4FF` | 5.0 / 8.5 |
| `--ring` | Focus ring | `#3673DB` | `#86B2FF` | |

### 2.2 Status

| Token | Light | Latar lembut | Dark | Latar lembut dark |
|---|---|---|---|---|
| `--success` | `#1F7548` | `#E7F6EE` | `#6ED7A0` | `#173327` |
| `--warning` | `#9A5B00` | `#FFF3E0` | `#F5B451` | `#3A2A12` |
| `--destructive` | `#B42318` | `#FDECEA` | `#FF8A80` | `#3A1A1A` |

Status selalu berupa **chip bulat** (teks + latar lembut), misalnya `4/6 siap`. Tidak boleh hanya warna.

### 2.3 Kategori expense

Palet dari V1 **tidak berubah** (urutan dan aturannya ada di [DESIGN_SYSTEM.md §2](DESIGN_SYSTEM.md)). Ditambah varian dark: Stay `#5b9be6`, Transport `#2fcb93`, Food `#f08457`, Activity `#8b7ce0`, Gift `#ee95b7`, Shopping `#f5b52e`, Other `#9aa1ab`.

### 2.4 Cover & area di atas cover

Cover selalu gelap (senja), **di light maupun dark mode**. Elemen di atasnya memakai token tetap:

| Token | Nilai | Pakai |
|---|---|---|
| ✚ `--on-cover` | `#FFFFFF` | Judul dan teks di atas cover |
| ✚ `--on-cover-chip` | `rgba(255,255,255,.16)` | Chip statistik di atas cover |
| ✚ `--cover-button` | `rgba(255,255,255,.85)` + teks `#23324D` | Tombol bulat (back, share, more) di atas cover |
| ✚ `--cover-fallback` | `radial-gradient(120% 70% at 78% 100%, #F4A26B8C, transparent 60%), linear-gradient(#011334, #0E2B53 55%, #205A81)` | Trip tanpa cover |

### 2.5 Peta

| Token | Light | Dark |
|---|---|---|
| ✚ `--map-land` | `#F5F8FD` | `#172238` |
| ✚ `--map-water` | `#DDEBFD` | `#1A3459` |
| ✚ `--map-park` | `#E4F4E8` | `#1A3529` |
| ✚ `--map-road` | `#FFFFFF` | `#24324E` |

Dipakai untuk style MapLibre (V4) supaya peta terasa satu keluarga dengan UI. Rute memakai `--primary`.

### 2.6 Elevasi

| Token | Light | Dark |
|---|---|---|
| `--shadow-card` | `0 2px 4px rgb(54 115 219 / .04), 0 12px 32px rgb(54 115 219 / .08)` | `0 2px 4px rgb(0 0 0 / .2), 0 12px 32px rgb(0 0 0 / .25)` |
| `--shadow-overlay` | `0 16px 48px rgb(35 50 77 / .16)` | `0 16px 48px rgb(0 0 0 / .45)` |

Kartu memakai `shadow-card` **dan** border 1px `--border`. Pengecualiannya adalah kartu yang berada di atas cover atau peta, yang memakai shadow saja.

---

## 3. Tipografi

| Peran | Family | Class | Pakai |
|---|---|---|---|
| Display | **Nunito** 700/800 | `font-display` | Judul halaman, judul trip, judul hari, nama tempat, kode bandara di tiket, angka besar |
| UI / body | **Nunito Sans** 400/600/700/800 | `font-sans` (default) | Semua teks lain |

- Dimuat via `next/font/google`. Inter dan Geist dihapus.
- Angka selalu `tabular-nums` (diset global di `body`). Tidak ada font mono.
- **Judul dua nada**: bagian utama `foreground`, bagian pelengkap `muted-foreground` dengan bobot yang sama. Contoh: "Umrah **9 Hari**", "Halo, Ahmad / *mau ke mana lagi?*".

| Token | Ukuran / line-height | Family / bobot | Contoh |
|---|---|---|---|
| `text-hero` | 40/1.05 (mobile 28) | display 800 | Judul trip di hero desktop |
| `text-3xl` | 30/1.1 | display 800 | Angka total budget |
| `text-2xl` | 24/1.15 | display 800 | Judul trip mobile, judul halaman |
| `text-xl` | 20/1.25 | display 800 | Judul hari, judul section |
| `text-lg` | 18/1.3 | display 800 | Nama tempat, judul kartu, tanggal di lingkaran |
| `text-base` | 16/1.5 | sans 400–700 | Body, input (16px mencegah zoom otomatis di iOS) |
| `text-sm` | 14/1.4 | sans 600–800 | Tombol, tab, pill jam, chip, body di kartu |
| `text-xs` | 12/1.35 | sans 400–600 | Meta, keterangan. **Batas minimum** |

Skala memakai bawaan Tailwind (sama dengan V1); hanya `text-hero` yang baru.

---

## 4. Bentuk, spasi, layout

### 4.1 Radius

| Token | Nilai | Pakai |
|---|---|---|
| `rounded-full` | 999px | Tombol, tab, chip, pill jam, lingkaran tanggal, nav, avatar, tombol ikon |
| `rounded-lg` | 16px | Baris list, fact box, thumbnail, input |
| `rounded-xl` | 22px | Kartu umum (stay, budget, kartu trip) |
| `rounded-2xl` | 28px | Panel besar, boarding pass, peta, sheet (atas) |
| `rounded-3xl` | 32px | Hero desktop, cover mobile (bawah saja) |

### 4.2 Spasi & kepadatan

| Konteks | Mobile | Desktop |
|---|---|---|
| Gutter halaman | 16px | 28px |
| Gap antar kartu atau section | 12px | 14–16px |
| Padding kartu | 12–16px | 16px |
| Baris list | 10×12px, gap 8px | sama |
| Target sentuh | ≥ 44px | ≥ 36px |

### 4.3 Shell

```
Desktop                                         Mobile (di dalam trip)
┌─────────────────────────────────────────┐     ┌──────────────────────┐
│ Logo  [Trips] AI  Kurs        +Trip  (A)│     │ ┌ cover, bulat bawah ┐│
├─────────────────────────────────────────┤     │ │ (<)         (⇪)(…) ││
│ ┌ hero: cover ilustrasi ──────────────┐ │     │ └────────────────────┘│
│ │ 88 hari lagi                  (⇪)(…)│ │     │ Umrah 9 Hari          │
│ │ Dream Tour Umrah 9 Hari             │ │     │ (10)(11)(12)(13)(14)  │
│ │ [24 kegiatan][5 transport][2 stay]  │ │     │ [06:00–07:00][10:00]  │
│ └──────[Itinerary|Peta|Bookings|…]────┘ │     │ kegiatan + tiket      │
│ ┌ itinerary 470px ┐ ┌ peta ───────────┐ │     │                       │
│ │ (10)(11)(12)…   │ │ [Hari 1][Hari 2]│ │     │ ╭ nav mengambang ───╮ │
│ │ baris kegiatan  │ │  pin + label    │ │     │ │[▣ Itinerary] ◫ ▤ ▣│ │
│ │                 │ │     ┌ kartu ┐   │ │     │ ╰───────────────────╯ │
│ └─────────────────┘ └─────┴───────┴───┘ │     └──────────────────────┘
└─────────────────────────────────────────┘
```

- **Desktop:** top bar (logo, nav pill global, `+ Trip baru`, avatar) → hero cover → tab pill yang menempel di tepi bawah hero → split itinerary (kiri, 470px) dan peta (kanan, fluid). Lebar maksimal konten 1440px.
- **Mobile:** nav mengambang di bawah. Di luar trip isinya global (Trips · AI · Kurs · Profil). Di dalam trip isinya tab trip (Itinerary · Peta · Bookings · Budget · Ringkasan), dan keduanya tidak pernah tampil bersamaan. Tab Peta di mobile memakai peta penuh dengan detail di bottom sheet.
- Top bar global versi lama dan bottom nav berlapis dihapus.

---

## 5. Komponen inti

| Komponen | Spesifikasi |
|---|---|
| **TripCover** | Gambar cover (§7), `object-position: 75% 50%`. Mobile: tinggi 250px dengan radius bawah 32px. Desktop: hero 210px dengan radius 32px. Tanpa cover memakai `--cover-fallback`. |
| **CoverButton** | Lingkaran 40px `--cover-button`, ikon 18px. Ditaruh di atas cover (kiri: back; kanan: share, more). |
| **TabPills** | Wadah `card` bulat dengan shadow. Item aktif berupa tint `primary-soft`, bukan blok penuh. Desktop: menempel di tepi bawah hero (margin-top −34px). |
| **DateCircles** | Lingkaran 48px berlatar `muted`, berisi angka tanggal (display 17) dan bulan (11px). Aktif = tint `primary-soft`. Titik 4px di bawah menandai hari yang punya kegiatan. Bisa digeser. |
| **TimePills** | Pill `card` dengan border. Aktif = tint tanpa border. Isi: `06:00 – 07:00`. Memilih pill menggulung ke kegiatan terkait. |
| **ActivityRow** (desktop/list) | Baris radius 16 berlatar `muted`, berisi jam dalam pill putih, judul, meta, dan ikon dalam lingkaran. Aktif = tint. |
| **BoardingPass** | Kartu radius 28. Header (nomor + chip maskapai), kode asal/tujuan display 28, garis putus-putus dengan ikon moda, dua lekukan setengah lingkaran di kiri/kanan, lalu grid 3×2 (Berangkat, Tiba, Durasi, Tanggal, Hari, Kursi/Gate). Dipakai untuk flight, train, bus, ship. |
| **FloatingNav** | Pill 58px, `card` + border + shadow, 14px dari tepi. Item aktif = pill tint dengan label; item lain hanya ikon (dengan `aria-label`). |
| **MapBubble** | Label pill `card` di atas titik pin 12px. Aktif = `primary` solid. Isi: jam atau nama tempat. |
| **BottomSheet** | Radius atas 30, grab handle 44×5. Isi: thumbnail + nama tempat, 3 fact box, tombol utama "Buka di Maps". |
| **FactBox** | Kotak radius 16 berlatar `muted`, berisi label 11px dan nilai 13px bold. |
| **StatusChip / Chip** | Pill 12px/800 berlatar lembut. |
| **Button** | Pill tinggi 44 (mobile) / 36–40 (desktop). Varian: `primary` (biru solid), `soft` (`muted`), `ghost`, `destructive`. |
| **NextTripCard** (beranda) | Cover 230px radius 28, chip hitung mundur di kanan atas, kartu putih mengambang di bawah (judul, tanggal, chip status). |
| **TripCard** (grid/list) | Kartu putih padding 6, cover radius 17, judul 13 bold, tanggal 11.5. |
| **BudgetMeter** | Bar 8px bulat dengan celah 2px antar segmen kategori. Caption `97% terpakai · sisa Rp 133.000`. |

Ikon: Lucide stroke 2, ukuran 16 / 18 / 20. Ilustrasi hanya untuk cover dan empty state, dengan gaya yang sama seperti cover.

---

## 6. Motion

| Durasi | Pakai |
|---|---|
| 150ms `ease-out` | hover, tekan (skala 0.98 pada tombol dan kartu), toggle tint |
| 250ms `cubic-bezier(.2,.8,.2,1)` | sheet, dialog, pindah tab, scroll ke kegiatan |
| Spring ringan | Bottom sheet peta saat ditarik |

Tidak ada animasi dekoratif. Semua mengikuti `prefers-reduced-motion`.

## 7. Cover

- Sumber berurutan: cover custom trip → katalog destinasi (`coverCatalog.ts`) → **`navisha-default.png`** (dibuat dari [COVER_PROMPTS.md](design/COVER_PROMPTS.md)) → `--cover-fallback` (CSS).
- Kotak abu-abu dengan ikon pin **dihapus**.
- Teks di atas cover selalu memakai `--on-cover` dan diletakkan di sisi kiri yang memang kosong di setiap cover.

## 8. Brand

- Wordmark "Navisha" memakai Nunito 900, tracking −0.02em.
- Logomark: kompas sederhana di kotak bulat (radius 12) berwarna `primary`. Ini kelanjutan logo sekarang, hanya dibuat lebih bulat.

## 9. Aksesibilitas

- **Light adalah tema bawaan**; dark adalah pilihan user.
- Kontras AA di light **dan** dark (lihat kolom kontras §2.1; semua pasangan teks ≥ 4.5:1).
- Fokus: ring 2px `--ring` dengan offset 2px, juga di atas cover.
- Target sentuh ≥ 44px di mobile. Ikon tanpa label wajib punya `aria-label`.
- Warna (status, kategori, hari aktif) selalu didampingi teks atau angka.

## 10. Checklist review

- [ ] Cover menjadi satu-satunya area yang berwarna penuh di layar ini.
- [ ] State aktif memakai tint `primary-soft`. Biru solid hanya untuk aksi utama dan pin aktif.
- [ ] Semua kontrol bulat (pill atau lingkaran); kartu memakai radius dari §4.1.
- [ ] Tanggal, jam, dan informasi utama terlihat tanpa scroll di 390px.
- [ ] Dicek di light dan dark, 390px dan 1440px.
- [ ] Tidak ada hex di komponen, tidak ada teks < 12px.

## 11. Implementasi (V1, ringkas)

1. `app/layout.tsx`: Nunito + Nunito Sans via `next/font/google`.
2. `globals.css`: token §2 di `:root` (light) dan `.dark`. **Tema bawaan: light**, tidak mengikuti pengaturan OS. Dark hanya aktif jika user memilihnya lewat toggle (Terang / Gelap). Pilihan disimpan di cookie agar SSR tidak berkedip.
3. `tailwind.config.ts`: `primary-soft`, `on-cover`, `map-*`, radius §4.1, fontSize §3.
4. `/dev/ui` menampilkan semua token dan komponen §5 di light dan dark.
5. Cover: `getDefaultTripCover()` memakai default + fallback CSS (§7).
