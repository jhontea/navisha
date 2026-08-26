# PRD — Fitur Rekomendasi Destinasi & Katalog Tempat (RAG)

> **Tanggal:** 2026-08-24
> **Status:** Draft PRD
> **Dokumen terkait:** `PLANNING_RAG_REKOMENDASI.md` (konsep & arsitektur), `TRD_RAG_REKOMENDASI.md` (teknis)
> **Tujuan:** Memberi pengguna katalog tempat terkurasi (awalnya: tempat halal & viral) yang dapat
> (1) direkomendasikan saat membuat trip, dan
> (2) dipakai sebagai sumber fakta untuk AI generate trip & summary (mengurangi halusinasi tempat).

---

## 1. Ringkasan & tujuan

### Masalah
1. **Kesulitan memilih tempat** — pengguna yang mengetik destinasi (mis. "Bandung") tidak melihat rekomendasi apa pun; mereka harus tahu sendiri atau berharap AI menebak.
2. **AI berhalusinasi tempat** — `autogen/usecase.go` sengaja *tidak percaya* koordinat dari LLM (di-strip lalu di-resolve ulang via Google Places). Nama tempat rekaan/negara keliru sering muncul.
3. **Tidak ada kanalisasi referensi** — tidak ada tempat untuk rekomendasi bertema (halal, viral, hidden gem) yang bisa dipakai berulang.

### Tujuan
- Menyediakan **katalog tempat terkurasi** sebagai sumber kebenaran (single source of truth) untuk rekomendasi & grounding AI.
- **Merekomendasikan tempat** saat user membuat trip / memilih destinasi (filter: halal, viral, kategori, style).
- **Menyuntikkan tempat nyata** ke prompt AI generate trip & summary sehingga AI memakai fakta dari katalog, bukan mengarang.
- Mengurangi biaya & kegagalan resolve koordinat di frontend dengan mengirim koordinat `verified` dari backend.

### Bukan (Non-goals)
- Bukan pengganti Google Maps/Geoapify autocomplete untuk pencarian bebas.
- Bukan marketplace/tempat berbayar; tidak menyimpan reservasi.
- Fase 1 tidak menambahkan embedding (retrieval berbasis tag/FTS untuk MVP).

---

## 2. Persona & use case

| Persona | Use case | Nilai |
|---|---|---|
| **Muslim traveler** | "Tempat halal / masjid dekat itinerary saya di Bandung" | Hemat waktu, ibadah & makan terjamin |
| **Content/Gen-Z traveler** | "Tempat viral / instagramable di tempat X" | Rekomendasi tren terkini |
| **Perencana umum** | "Rekomendasi tempat & aktivitas awal saat bikin trip" | Titik mulai yang lebih baik |
| **Prompt AI-driven** | "Generate trip ke X dengan style Y" | Itinerary berisi tempat **nyata** & **bervariasi** |

### User journeys inti
1. **Jelajah rekomendasi**: buka wizard trip → ketik destinasi → lihat kartu "Terpopuler/Halal/Viral" → pilih → menjadi aktivitas.
2. **Generate trip kontensual**: isi prompt → backend ambil top-N tempat → LLM rangkai itinerary dari daftar nyata.
3. **Generate summary**: penerimaan saran tempat/lokal berdasarkan destinasi trip.

---

## 3. Persyaratan fungsional

### F1. Katalog tempat (corpus)
- CRUD tempat oleh **admin/POD** (internal tooling) dan **seeder** (file bundel).
- **Tahap pertama (Fase 0) adalah tooling pengisian data**: CLI Go (`go run ./cmd/...`) dengan subcommands:
  1. **`import`** — mengimpor seed file (`backend/seed/places/<kota>.yaml|json`) → **jalur utama** (kurasi manual), idempotent (dedup by `name+city`).
  2. **`link`** — paste link Google Maps → otomatis ekstrak koordinat, tanpa key API.
  3. **`suggest`** — AI menghasilkan kandidat tempat (tanpa koordinat) untuk mempercepat eksplorasi.
  4. *(opsional)* **`fetch`** — mengambil dari Google Places API (bila API tersedia; data bertanda `auto`).
- Field utama: `name`, `city`, `area`, `country_code`, `lat/lng`, `category`, `tags`, `halal_status`, `is_viral`, `description`, `image_url`, `google_place_id`, `rating`, `price_level`, `opening_hours`, `source_url`, `coverage_status`.
- **Field minimal wajib untuk seed manual:** `name`, `city`, `lat`, `lng`, `category`. Sisanya (`halal_status`, `is_viral`, `description`, `tags`, `area`) adalah nilai tambah yang membuat rekomendasi lebih tajam.
- **Default longgar** (tidak memblokir input): `category`→`lainnya`, `tags`→`[]`, `halal_status`→`unknown`, `coverage_status`→`unverified` (manual: `import`/`link`) / `candidate` (`suggest`) / `auto` (`fetch`).
- `coverage_status` ∈ `verified | unverified | candidate | auto` (4 nilai, SERAGAM):
  - `verified` = sudah ditinjau → boleh tampil publik & grounding AI.
  - `unverified` = data manual belum ditinjau → tampil publik dgn label, **tidak** di-grounding.
  - `candidate` = kandidat AI (tanpa koordinat) → internal/review saja.
  - `auto` = hasil API otomatis → internal/review saja.
  - Data kurasi manual (`import`/`link`) menulis `unverified`; `suggest` → `candidate`; `fetch` → `auto`; operator mempromosikan ke `verified`.

### F1b. Panduan kurasi & eksplorasi (bagaimana operator mengisi data)

#### Cara menemukan tempat (eksplorasi)
- **Fokus awal: eksplorasi manual kota Bandung** (sebelum tooling otomatis).
- Google Maps search: `masjid Bandung`, `restoran halal Bandung`, `tempat hits Bandung`.
- Tab **Jelajahi/Explore** Google Maps → kategori "Terpopuler", "Wisata", "Makan & Minum".
- Sumber lokal: blog kuliner, TikTok/Instagram (hashtag `#kulinerbandung`, `#bandunghits`).
- Review & rating Google Maps: urutkan berdasar **jumlah review**, bukan hanya bintang.
- **Foto tempat (tanpa key Google, bisa sekarang):** buka tempat → **klik kanan foto** → **"Salin alamat gambar"** → dapat URL publik `lh*.googleusercontent.com` (bersih, ~pendek, tidak perlu `shortPhotoUrl()`).
- **AI-assisted (Mode D, fase lanjut):** LLM menghasilkan kandidat untuk dipercepat — lalu operator verifikasi sendiri.
- **Web research (next improvement):** AI menjelajah artikel/website untuk menemukan kandidat — ditunda, lihat §8.

#### Cara menentukan atribut (inti kurasi)

| Atribut | Cara tentukan | Nilai di data model |
|---|---|---|
| **Halal** | Cek logo/badge halal MUI di foto, cari kata "halal" di review, cek menu (ada babi/alkohol?) | `halal_status`: `yes` (pasti), `halal_friendly` (banyak opsi halal), `unknown` (ragu) |
| **Viral** | Review banyak + rating bagus, antri, sering muncul di TikTok/IG | `is_viral: true` + tag `viral` |
| **Direkomendasikan** | Penilaian editorial (worth visiting berdasar rating, suasana, ulasan) | tag `direkomendasikan` / `hidden_gem` |
| **Kategori** | Kuliner? alam? budaya? ibadah? belanja? | `category` |

**Aturan anti-klaim berlebihan:** jangan paksa `halal_status: yes` bila ragu (pakai `halal_friendly`/`unknown`); viral & rekomendasi bersifat subjektif & berubah → simpan `checked_at` untuk ditinjau ulang.

#### Peran AI vs manusia (AI-assisted exploration)
| Tahap | AI (LLM) | Operator (kurator) |
|---|---|---|
| Temukan kandidat | ✅ hasilkan nama + kategori + dugaan status | ✅ tambah dari pengalaman sendiri |
| Koordinat | ❌ **dilarang** mengarang (anti-halusinasi) | ✅ paste link Maps / catat lat,lng |
| Verifikasi halal/viral | ⚠️ dugaan, ditandai `candidate` | ✅ keputusan final → `verified` |
| Deskripsi | ✅ draft (bisa diedit) | ✅ koreksi |

### F2. Rekomendasi tempat
- `GET /api/v1/places/recommend?city=&area=&category=&halal=&viral=&style=&limit=`
- Kembalikan daftar tempat dengan gambar, koordinat, tag, skor relevansi, dan alasan singkat cocok.
- Filter gabungan (halal + viral + kategori + kota) tetap bisa diinterseksi.

### F3. Pencarian tempat
- `GET /api/v1/places/search?q=&city=` — autocomplete/suggest dari katalog (pelengkap Geoapify/Google).

### F4. Grounding AI generate trip
- Saat `autogen.GenerateDraft`, suntik top-N tempat (dari `Destination` + `TravelStyle`) ke **system prompt** sebagai blok "TEMPAT NYATA (WAJIB DIPAKAI)" — **nama + kategori + halal saja (tanpa koordinat)** via provider `PlaceContextProvider` (pola `DayContextProvider`), bukan dari `BuildPrompt` (fungsi murni).
- Instruksi: wajib memakai tempat dari daftar untuk aktivitas `location`; nama generik hanya sebagai fallback.
- **Koordinat dipasang pasca-`GenerateDraft`** di layer `integration`: cocokkan `location_name` dengan katalog → isi `lat/lng` + `LocationVerification="verified"`; frontend skip aktivitas yang sudah `verified`.
- Validasi pasca-LLM: aktivitas `location` yang dihasilkan harus cocok dengan kota destinasi; tidak boleh kota/negara lain.

### F5. Grounding AI summary (prioritas rendah)
- Suntikan tempat/lokal berdasarkan `TripContext.Destination` untuk memperkaya "Tips lokal".

### F6. UX wizard trip
- Kartu rekomendasi di samping field destinasi; tap kartu → isi aktivitas/simpan place.
- Tampilkan badge "Halal ✅", "Viral 🔥", kategori, gambar.

---

## 4. Persyaratan non-fungsional

| Kategori | Persyaratan |
|---|---|
| **Performa** | `recommend`/`search` < 200 ms p95 (non-cache), < 50 ms p95 (warm Redis cache). Halaman wizard tidak blokir interaksi utama. |
| **Skalabilitas** | Corpus dari ribu → 100rb tempat tanpa perubahan query (FTS + index; Phase 2: pgvector HNSW). |
| **Biaya** | Fase 1 **tanpa** embedding eksternal (0 biaya API); embedding hanya di Phase 2 & dicache Redis. |
| **Keamanan** | Endpoint rekomendasi perlu auth (konsisten dengan `/api/v1` lainnya). Admin CRUD terpisah & dibatasi. |
| **Ketersediaan** | Corpus read-only default; seeding via migrasi/CLI. Redis cache failure → fallback ke DB. |
| **Keakuratan** | Hanya `coverage_status=verified` yang diekspos sebagai fakta AI. `unverified` boleh tampil publik dgn label; `candidate`/`auto` hanya untuk antrian internal/review. |

---

## 5. Keputusan produk (diambil 2026-08-24)

| # | Keputusan | Nilai yang dipilih |
|---|---|---|
| 1 | **Bentuk tooling data** | **CLI Go native** (`cmd/`) — subcommands `import`, `link` (paste link Maps), `suggest` (AI bantu eksplor), `fetch` (opsional), `status`. Tanpa UI admin (fase ini). |
| 2 | **Sumber data awal** | **Kurasi manual** — paste link/koordinat dari Google Maps (sesekali) + **dibantu AI untuk eksplorasi kandidat**. **Google Places API opsional/sekunder** (key tidak wajib). |
| 3 | **Verifikasi data** | **Dasar saja** — validasi enum/rentang; label `coverage_status`, belum pipeline review penuh |
| 4 | **Kota seed pertama** | **Bandung** (satu kota dulu, jadi acuan) |
| 5 | **Urutan kerja** | **Tooling data dulu** → baru fitur rekomendasi/grounding AI |

### Perubahan sumber data (karena API Google bermasalah)
Semula direncanakan memakai Google Places API sebagai sumber otomatis. Karena API saat ini bermasalah (kuota/billing/kendala akses), **prioritas dibalik**:

- **Utama — kurasi manual (Mode B/C):** data diambil sesekali dari Google Maps di browser. Dua cara cepat:
  - **Paste link** (paling cepat): bagikan → salin link → subcommand `link` mengekstrak koordinat otomatis.
  - **Koordinat manual**: klik kanan titik di peta → salin (bentuk `-6.9147,107.6098` = `lat,lng`).
- **Dibantu AI (Mode D):** AI menghasilkan *kandidat* tempat (nama, kategori, dugaan status) untuk mempercepat eksplorasi; **AI dilarang mengarang koordinat** — koordinat tetap dari Anda/Google Maps.
- **Sekunder — Google Places API (Mode A):** hanya dipakai bila API pulih / key tersedia; datanya bertanda `auto`. Tidak menghalangi mulai.

**Keunggulan kurasi manual:** (1) tidak bergantung kuota/rate-limit API; (2) status **halal** & **viral** ditentukan sendiri — justru ini yang tidak bisa ditebak Google API; (3) data fokus "beberapa tempat penting" sesuai keinginan; (4) AI mempercepat dari "halaman kosong" ke kandidat.

> **Catatan legalitas (tetap berlaku untuk Mode A):** bila nanti memakai API otomatis, gunakan **Google Places API** resmi (`Text Search`, `Nearby Search`, `Place Details`), **bukan** scraping mentah (HTTP/Selenium) yang melanggar ToS dan rawan diblokir. Navisha sudah punya akses resmi (Google Places + Geoapify).

### Keputusan yang masih terbuka (diputuskan saat mulai build fitur)
- **Scope kategori seed**: hanya halal, hanya viral, atau campuran (halal + viral + kategori umum). *Arab awal: campuran.*
- **Prioritas integrasi**: wizard rekomendasi dulu vs grounding generate-trip dulu.

---

## 6. Kriteria keberhasilan / metrik

- **Adoption**: % wizard yang memakai rekomendasi → menghasilkan aktivitas tempat.
- **Kualitas AI**: % aktivitas `location` dari trip hasil generate yang *resolve sukses* ke koordinat nyata **naik** (vs baseline sebelum grounding) dan tidak lagi bergantung 100% ke resolve frontend.
- **Performa**: p95 latency rekomendasi memenuhi NFR.
- **Keberagaman**: aktivitas tidak berulang/diluar kota (mengurangi insiden seperti "lokasi muncul dari negara lain" yang pernah di-fix).

---

## 7. Risiko produk

| Risiko | Mitigasi |
|---|---|
| Halal status salah/berubah (resto tutup) | `coverage_status`+`source_url`+`checked_at`; label "halal_friendly" jgn dipaksa pasti |
| Data mahal/tidak lengkap per kota | Mulai kota kecil, pakai open data + kurasi manual, tandai sumbernya eksplisit (`auto`/`unverified`) |
| AI abaikan grounding | Instruksi prompt tegas + validasi post-LLM (filter kota) |
| Embedding API cost di Phase 2 | Cache Redis, batch ingestion, vektor kecil |

---

## 8. Target rilis & estimasi

| Fase | Lingkup | Status |
|---|---|---|
| **P0 — Eksplorasi manual Bandung** | Jelajah sendiri (Google Maps search, blog, TikTok/IG) → catat data (CSV/`seed/places/bandung.yaml`) | **Mulai sekarang** |
| **P1 — Tooling data** | `migrations/021` + `cmd/place-seed` (`import`/`link`/`suggest`/`status`) | setelah P0 |
| **P2 — Fitur rekomendasi/grounding** | API `recommend`/`search`, grounding autogen, UX wizard | setelah P1 |
| **P3 — Next improvement** | Web Research Agent + review queue + scheduler | di kemudian hari |

- **MVP (P0–P2)**: corpus + rekomendasi + grounding generate trip + UX wizard ≈ **8–14 hari kerja**.
- Lihat milestone detail di `PLANNING_RAG_REKOMENDASI.md` §9.

### Next improvement — Web Research Agent (AI eksplorasi internet)

> **Status: DITUNDA.** Bukan prioritas sekarang. Dicatat agar skema `places` tidak perlu dirombak nanti.

**Tujuan:** AI menjelajah internet (membaca artikel/blog kuliner) untuk menemukan tempat halal/viral/rekomendasi, lalu menyimpannya sebagai `candidate` untuk ditinjau.

**Kebutuhan baru:** LLM bawaan belum bisa browsing → perlu ditambah:
- **Search client** (Tavily / Brave Search API / SerpAPI) — cari artikel relevan.
- **Fetch + extract** (HTML → teks bersih, hormati `robots.txt`/ToS).
- **Geocoder** (Geoapify yang sudah ada / Nominatim) — ubah nama → koordinat (BUKAN dari LLM).

**Alur singkat:** `query → search → ambil halaman → LLM ekstrak kandidat (nama/kategori/deskripsi, tanpa koordinat) → geocoder → simpan candidate + source_url → reviewer approve → verified`.

**Prinsip tetap:** anti-halusinasi (koordinat tidak dari LLM), `source_url` sebagai jejak audit, hasil selalu `candidate` sampai review manusia. Detail arsitektur & risiko legalitas: lihat `PLANNING_RAG_REKOMENDASI.md` §9c.