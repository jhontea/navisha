# Prompt Cover Trip Navisha

> Untuk membuat cover baru yang gayanya sama dengan 28 cover di katalog (`assets.navisha.cloud/trip-covers/`, terdaftar di `frontend/src/features/trip/lib/coverCatalog.ts`).
> Prioritas sekarang: **satu cover default** (`navisha-default.png`) untuk semua trip yang destinasinya belum punya cover. Prompt per kategori dan per destinasi ada di bawah untuk nanti.

## 1. Ciri cover yang ada

Hasil analisis 5 cover (Bali, Tokyo, Singapore, Bandung, Jakarta):

| Aspek | Ciri |
|---|---|
| Ukuran | **1760 × 894 px** (≈ 2:1), PNG, RGB |
| Komposisi | **Sisi kiri ±40–45% kosong**: gradasi navy polos untuk teks. Pemandangan ada di kanan, dan objek utama di sepertiga kanan. |
| Waktu | Senja menuju malam (blue hour). Matahari baru saja terbenam di horizon. |
| Langit | Navy di atas → biru laut → teal → peach/rose tipis di horizon |
| Cahaya | Lampu kecil berwarna amber hangat (jendela, lentera) sebagai titik fokus |
| Gaya | Ilustrasi vektor flat dengan kedalaman atmosfer (lapisan makin pucat ke belakang), tekstur grain halus, siluet bersih |
| Isi | Tanpa teks, tanpa orang, tanpa logo |

**Palet acuan** (dari kuantisasi warna cover):

| Peran | Hex |
|---|---|
| Malam (kiri dan atas) | `#011334` |
| Navy | `#0E2B53` |
| Biru laut | `#054277` |
| Slate senja | `#42608A` |
| Teal kabut | `#558E9D` |
| Rose senja | `#C6A299` |
| Peach horizon | `#F4A26B` |
| Lampu | `#FFB65C` |

## 2. Prompt gaya (dipakai di semua cover)

Tempel blok ini di setiap prompt, lalu tambahkan bagian **Scene** di bawahnya.

```
Wide 2:1 landscape travel illustration, 1760x894.
Composition: the LEFT 42% of the frame is an empty, smooth, dark navy gradient (#011334 to #0E2B53) with no objects, reserved for text. It must blend seamlessly into the scene, with no visible edge, border or vertical seam. The main subject sits in the right third; the horizon line is at about 62% of the height.
Time: blue hour, just after sunset.
Sky: deep navy at the top fading to ocean blue (#054277) and misty teal (#558E9D), with a thin warm peach (#F4A26B) and dusty rose (#C6A299) glow along the horizon.
Style: flat vector illustration with soft atmospheric perspective (layers get lighter and bluer with distance), clean silhouettes, subtle film grain, gentle gradients, calm and cinematic. A few small warm amber lights (#FFB65C) as focal points: lit windows or lanterns.
Palette limited to navy, ocean blue, teal, dusty rose, peach and warm amber.
```

**Negatif** (jika alatnya mendukung negative prompt):

```
text, letters, watermark, logo, signature, people, faces, crowds, photorealistic, 3D render, harsh outlines, neon, saturated rainbow colors, daylight, hard vertical seam, frame, border, cropped subject on the left side
```

## 3. Cover default (dibuat sekarang)

File: **`navisha-default.png`**. Dipakai untuk semua trip yang destinasinya tidak cocok dengan katalog.

Syaratnya umum: tidak menunjuk satu negara atau agama, dan tetap terasa "perjalanan".

```
[Prompt gaya]

Scene: a calm, generic travel landscape. On the right: gentle layered hills fading into mist, a winding road that leads toward a distant coastline, a small cluster of houses with warm lit windows on a hillside, and a calm bay reflecting the horizon glow. In the upper right sky, a small airplane with a faint contrail heading toward the horizon. No recognizable landmark, no religious or national buildings, no flags.
```

Alternatif jika hasil pertama terlalu ramai:

```
[Prompt gaya]

Scene: minimal and quiet. Layered rolling hills in four depths fading into teal mist, a single small house with one warm lit window on the nearest hill, a thin winding path, and a faint airplane contrail across the upper right sky. Lots of calm sky. No landmarks.
```

## 4. Cover per kategori (nanti)

Untuk dipilih otomatis berdasarkan jenis destinasi, jika kelak ada klasifikasi (misalnya dari AI saat membuat trip). Nama file: `navisha-cat-<kategori>.png`.

| Kategori | Scene |
|---|---|
| `beach` | Tropical bay, palm silhouettes, distant islands, a small wooden boat, a lantern on a short pier, calm sea reflections. |
| `mountain` | Layered mountain ranges with one higher peak, pine forest in the foreground, a cabin with warm windows, a winding road with tiny headlights. |
| `city` | Generic skyline of a few towers, a low old-town row with lit windows, a bridge over a river with reflections. No famous landmark. |
| `countryside` | Terraced green hills or rice fields, a small village with lanterns, a train crossing a viaduct with lit windows. |
| `roadtrip` | A long highway curving through desert or plains toward the horizon, a small car with headlights, distant mesas, telephone poles. |
| `pilgrimage` | A peaceful courtyard with arches and soft lantern light, minarets or domes kept **small and distant** as silhouettes, calm and respectful. |

## 5. Cover per destinasi yang belum ada

Ditemukan dari trip yang ada: **Makkah** dan **Madinah**. Nama file: `navisha-<kota>.png`. Tambahkan alias di `coverCatalog.ts`.

| File | Scene |
|---|---|
| `navisha-makkah.png` | View toward the Masjid al-Haram area at blue hour: the clock tower as a distant silhouette, surrounding minarets, rocky hills around the valley, warm lights across the city. Respectful, no people, no close-up of the Kaaba. |
| `navisha-madinah.png` | Masjid an-Nabawi at blue hour: the green dome and minarets as soft silhouettes, the large umbrella canopies of the courtyard, palm trees, warm lights. Respectful, no people. |

Alias yang disarankan: `makkah`, `mecca`, `makkah al mukarramah`, `mekkah` / `madinah`, `medina`, `madinah al munawwarah`.

## 6. Cek sebelum diunggah

- [ ] Ukuran 1760 × 894, PNG.
- [ ] Sisi kiri ±42% kosong dan **tanpa sambungan** dengan scene.
- [ ] Tetap bagus saat dipotong ke **4:3 dan 1:1 yang berpusat di 75–78% horizontal**, karena kartu HP dan thumbnail memotong ke sisi kanan.
- [ ] Tidak ada teks, orang, atau logo.
- [ ] Jika disandingkan dengan cover lain di grid, warnanya terasa satu keluarga.
- [ ] Unggah ke R2 `trip-covers/<file>`, lalu tambahkan entri di `coverCatalog.ts`. Untuk default, lihat §7.

## 7. Integrasi (dikerjakan di fase redesign)

- `getDefaultTripCover()` di `frontend/src/features/trip/lib/cover.ts` sekarang mengembalikan `""` jika destinasi tidak cocok. Nanti fungsi ini mengembalikan `trip-covers/navisha-default.png`.
- Sampai file default diunggah, UI memakai **fallback CSS**: gradasi navy `#011334 → #0E2B53 → #205A81` dengan cahaya peach di kanan bawah. Kotak abu-abu dengan ikon pin tidak dipakai lagi.
