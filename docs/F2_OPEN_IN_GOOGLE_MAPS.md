# F2 — Open in Google Maps

Task breakdown untuk fitur **Open in Google Maps**. Sumber rencana: `docs/PLAN_PHASE2.md` bagian F2.

## Tujuan

Tombol **"Open in Google Maps"** di halaman **Itinerary (Map View)** yang membuka tab Google Maps baru berisi lokasi aktivitas bertipe `location` sebagai rute waypoint berurutan. Tombol menghormati filter hari yang aktif — bisa **Open in Maps per day** atau seluruh trip ("All days"). **Pure frontend** — tidak butuh perubahan backend.

> Catatan revisi: awalnya tombol diletakkan di header Trip Overview, lalu dipindah ke Map View di halaman Itinerary agar bisa open-in-maps per hari sesuai filter hari yang sedang dipilih.

## Konteks Teknis

- Google Maps directions URL menerima multiple waypoint:
  `https://www.google.com/maps/dir/<lat>,<lng>/<lat>,<lng>/...`
- Limit praktis ~10 waypoint per URL. Kalau lebih, ambil 10 pertama + info "Showing first 10 of N".
- Fallback: kalau tidak ada lokasi sama sekali, buka pencarian destinasi (`trip.description`) lewat `https://www.google.com/maps/search/?api=1&query=<query>`.

## Sumber Data (frontend)

Halaman overview sudah memuat:
- `trip.days` → aktivitas per day via `useActivities(dayId)` / `useQueries` (sudah ada untuk hitung total activities).
- Aktivitas tipe `location` punya `payload.lat` & `payload.lng` (`LocationPayload`).
- Akomodasi via `useAccommodations(tripId)` → `lat`/`lng` (nullable).

Urutkan: hari (day_number) → `order_index` aktivitas. Filter yang tidak punya lat/lng valid (bukan 0/null).

---

## Unit Kerja

### F2-A — Utility `mapsUrl.ts`
**File baru:** `frontend/src/features/trip/lib/mapsUrl.ts`
- `interface MapPoint { lat: number; lng: number; label?: string }`
- `MAX_WAYPOINTS = 10`
- `buildMapsDirectionsUrl(points: MapPoint[]): string | null` — null kalau kosong; kalau 1 titik tetap valid; potong ke MAX_WAYPOINTS.
- `buildMapsSearchUrl(query: string): string` — fallback search by destination.
- `hasValidCoords(lat, lng)` helper — tolak `null`/`undefined`/`0,0`/`NaN`.

- [x] Selesai

### F2-B — Aggregation helper
Kumpulkan `MapPoint[]` dari activities (tipe location) + accommodations, terurut by day + order_index.
- Implementasi inline di overview page memakai data yang sudah di-fetch (`activityQueries`, `accommodations`).
- [x] Selesai

### F2-C — Tombol di Itinerary Map View
**File:** `frontend/src/features/map/components/TripMap.tsx`
- Tombol "Open in Google Maps" (icon `ExternalLink` dari lucide-react) di panel kiri Map View, di atas Route Info.
- Menghormati filter hari aktif (`activeDay`): "All days" → semua titik; hari tertentu → titik hari itu saja (per-day).
- `onClick`: agregasi titik visible → filter koordinat valid → potong ke `MAX_WAYPOINTS` → `buildMapsDirectionsUrl` → `window.open(url, "_blank", "noopener,noreferrer")`.
- Fallback ke `https://www.google.com/maps/` kalau tidak ada koordinat valid.
- Hanya tampil saat ada `totalPoints > 0`.
- [x] Selesai

### F2-D — Reposisi toggle List/Map View
**File:** `frontend/src/app/(dashboard)/trips/[id]/page.tsx`
- Toggle List/Map dipindah ke baris sendiri (di bawah back link), jadi segmented control besar full-width di mobile (`max-w-xs` di desktop).
- Tombol aktif pakai `bg-primary text-white` + label penuh ("List View" / "Map View") + `aria-pressed`, jadi lebih jadi fokus user.
- [x] Selesai

---

## Acceptance Criteria

- [x] Tombol muncul di Map View halaman Itinerary.
- [x] Klik → tab baru Google Maps dengan waypoint sesuai filter hari (per-day atau all).
- [x] Tidak ada lokasi valid → fallback buka Google Maps.
- [x] Toggle List/Map View lebih prominent & jadi fokus user.
- [x] >10 lokasi → 10 pertama (limit Google Maps).

## Verifikasi

- [x] `npm run lint` bersih.
- [x] `npm run build` sukses.

## Status

**SELESAI** — semua unit kerja & acceptance criteria terpenuhi.
