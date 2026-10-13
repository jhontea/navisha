# Navisha Design System

> Sumber kebenaran tampilan. Token ada di `frontend/src/app/globals.css` (CSS variables) dan `frontend/tailwind.config.ts` (nama class).
> Arah visual: travel-centric, peta dominan, bersih (acuan mood: Wanderlog). Tema: **light saja** untuk sekarang.
> Latar belakang dan temuan awal: [design/AUDIT_BASELINE.md](design/AUDIT_BASELINE.md).

## 1. Prinsip

1. **Konten dulu, dekorasi belakangan.** Warna dan bentuk dipakai untuk memberi makna (status, kategori, aksi utama), bukan hiasan.
2. **Satu cara untuk satu hal.** Satu gaya tombol utama, satu level shadow kartu, satu skala teks.
3. **Terbaca di HP.** Teks minimal 12px, body 14–16px, target sentuh minimal 44×44px.
4. **Desktop bukan mobile yang direntangkan.** Pakai ruang lebar untuk konteks berdampingan (list + peta, ringkasan + tabel).

## 2. Warna

### Inti
| Peran | Token / class | Catatan |
|---|---|---|
| Aksi utama, link, fokus | `primary` (`bg-primary`, `text-primary`, `ring`) | Biru `hsl(215 100% 36%)`. Solid, tanpa gradient. |
| Latar halaman | `background` | Polos, tanpa mesh gradient. |
| Permukaan kartu | `card` | Putih. |
| Teks utama | `foreground` | |
| Teks sekunder | `muted-foreground` | Untuk keterangan, label, meta. |
| Garis | `border` | Hairline 1px. |
| Bahaya / hapus | `destructive` | |
| Status | `success`, `warning`, `info` (+ `*-bg` untuk latar lembut) | Selalu dengan ikon + label, jangan warna saja. |

### Kategori expense
Satu palet untuk chip, ikon, chart, dan peta. Sudah divalidasi sebagai palet kategorikal (pemisahan warna untuk buta warna) **dalam urutan tetap di bawah**.

| Urutan | Kategori | Class | Hex |
|---|---|---|---|
| 1 | Stay (`accommodation`) | `bg-cat-stay` / `text-cat-stay` | `#2a78d6` |
| 2 | Transport | `cat-transport` | `#1baf7a` |
| 3 | Food | `cat-food` | `#eb6834` |
| 4 | Activity | `cat-activity` | `#4a3aa7` |
| 5 | Gift (`souvenir`) | `cat-gift` | `#e87ba4` |
| 6 | Shopping | `cat-shopping` | `#eda100` |
| 7 | Other | `cat-other` | `#7d8590` (netral) |

Aturan:
- Pakai map di `features/expense/categoryColors.ts` (`CATEGORY_COLORS`, `CATEGORY_ORDER`, `categoryRank`), jangan tulis warna kategori sendiri.
- Chart **tidak boleh mengurutkan ulang** segmen berdasarkan jumlah; pakai `CATEGORY_ORDER`. Beri celah 2px antar segmen.
- Warna kategori hanya untuk **tanda** (titik, ikon, batang). Teks label/angka tetap `foreground` / `muted-foreground`. Transport, Gift, dan Shopping kontrasnya < 3:1 di atas putih, jadi selalu ada label teks.
- Latar lembut: `bg-cat-*/10`.

### Dilarang
- Hex di komponen (`bg-[#FFEDD5]`, `text-[#7C3AED]`). Lint memberi warning. Tambahkan token kalau memang perlu warna baru.
- Token `chromatic-*`, `on-*`, `surface-*` (sisa MD3) untuk kode baru. Masih ada di config agar komponen lama tidak rusak.

## 3. Tipografi

- Satu family: **Inter**. Class: `font-sans` (default) dan `font-display` (judul, tracking lebih rapat).
- Skala tetap, pakai class bawaan Tailwind:

| Class | Ukuran | Pakai untuk |
|---|---|---|
| `text-xs` | 12px | Label kecil, meta, badge. **Batas minimum.** |
| `text-sm` | 14px | Body di kartu, form, tombol. |
| `text-base` | 16px | Body utama, input di mobile. |
| `text-lg` | 18px | Judul kartu. |
| `text-xl` | 20px | Judul section. |
| `text-2xl` | 24px | Judul halaman (mobile), angka besar. |
| `text-3xl` | 30px | Judul halaman (desktop), hero number. |

- Dilarang `text-[Npx]` (lint warning). Ukuran lama 9–11px sementara dipaksa jadi 12px lewat CSS.
- Angka uang dan statistik: `tabular-nums`.
- Nama class lama (`text-body-md`, `text-label-sm`, `font-heading`, …) masih ada di komponen lama; jangan dipakai di kode baru.

## 4. Spasi & layout

- Kelipatan 4px (skala Tailwind).
- Gutter halaman: mobile `px-4` (16px), desktop `px-6`–`px-8`.
- Jarak antar section: `space-y-6` (mobile) / `space-y-8` (desktop). Di dalam kartu: `gap-3`–`gap-4`.
- Lebar konten maksimal 1200px (`max-w-[1200px]` → nanti token `max-w-content`).

## 5. Bentuk & kedalaman

| Hal | Aturan |
|---|---|
| Radius | `rounded-md` (input, chip), `rounded-xl` (kartu, tombol besar), `rounded-full` (avatar, pill). |
| Shadow | Dua level saja: `shadow-card` (kartu) dan `shadow-overlay` (popover, dialog, sheet). |
| Kartu | `bg-card border rounded-xl` + **salah satu**: border atau `shadow-card`, tidak dobel dengan gradient. |
| Blur | Hanya untuk bar sticky yang menimpa konten. |
| Gradient | Hanya sebagai fallback cover trip ketika tidak ada foto. |

Utilitas lama `glass*`, `shadow-soft`, `soft-shadow`, `shadow-chromatic`, `trip-card-shadow`, `text-gradient*` sudah **dinetralkan** di `globals.css` (tampil sebagai kartu polos / teks biru). Jangan dipakai di kode baru; dihapus dari komponen saat komponen itu dibangun ulang.

## 6. Ikon

- Lucide saja. Ukuran 16 / 20 / 24 (`h-4`, `h-5`, `h-6`).
- Ikon sparkle (AI) hanya di satu titik masuk fitur AI.
- Tombol ikon wajib punya `aria-label` dan area sentuh ≥ 44px.

## 7. Motion

- Durasi 150ms (hover, toggle) dan 250ms (masuk/keluar panel), easing `ease-out`.
- Tanpa animasi melayang/berdenyut dekoratif. Hormati `prefers-reduced-motion` (sudah global).

## 8. Komponen

Katalog hidup: buka **`/dev/ui`** saat `npm run dev` (tidak ada di production).

| Komponen | Lokasi | Catatan |
|---|---|---|
| Button | `components/ui/button.tsx` | Varian `default` (primary solid), `outline`, `secondary`, `ghost`, `destructive` (lembut), `danger` (solid). Ukuran `default` 44px (40px dari md), `sm` 36px, `lg` 48px, `xs` 32px khusus desktop. `gradient`/`glass`/`chromatic` hanya alias lama. |
| IconButton | `components/IconButton.tsx` | `label` wajib (jadi `aria-label`); 44px default. |
| MoneyText / `formatMoney` | `components/MoneyText.tsx`, `lib/money.ts` | Tanpa sen untuk IDR/JPY/KRW/VND, 2 desimal lainnya, `tabular-nums`. `formatCurrency` di `lib/utils` sekarang alias. |
| StatTile | `components/StatTile.tsx` | Angka + label di kartu netral; `tone` hanya untuk status. |
| ResponsiveSheet | `components/ResponsiveSheet.tsx` | Bottom sheet di HP, dialog dari `sm`. Pakai untuk semua form. |
| EmptyState | `components/EmptyState.tsx` | 1 kalimat + 1 CTA; tanpa blob/animasi. |
| UserAvatar | `components/UserAvatar.tsx` | Foto Google dengan `no-referrer`, fallback inisial. |
| CurrencyBadge | `features/currency/components/CurrencyBadge.tsx` | Simbol mata uang, pengganti emoji bendera. |
| Card, Badge, Input, Select, Tabs, Dialog, Skeleton | `components/ui/*` (coss ui) | Varian dekoratif Card (`glass`, `gradient-border`) sudah dinetralkan. |

Target berikutnya:

Button (primary, secondary, ghost, danger; sm/md), IconButton, Input/Select/Textarea, Card, Badge/Chip, Tabs, Dialog, BottomSheet, EmptyState, Skeleton, StatTile, MoneyText.

- Primitive coss ui di `components/ui/` tidak diubah; varian tambahan dibuat di `components/`.
- `MoneyText`: format per mata uang (tanpa sen untuk IDR, JPY, KRW, VND), selalu tampilkan kode/simbol, `tabular-nums`.

## 9. Anti AI-slop (checklist review)

- [ ] Tidak ada gradient pada teks atau tombol.
- [ ] Tidak ada glass/blur kecuali bar sticky.
- [ ] Satu kartu = border **atau** shadow.
- [ ] Ilustrasi hanya di empty state.
- [ ] Copy menyebut aksi dan fakta, bukan slogan (lihat [COPY_GUIDE.md](COPY_GUIDE.md)).
- [ ] Tidak ada teks < 12px, tidak ada hex di class.
