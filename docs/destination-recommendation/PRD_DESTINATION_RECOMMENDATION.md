# PRD — Katalog Destinasi & Mesin Rekomendasi

| | |
|---|---|
| **Fitur** | Destination Catalog & Recommendation Engine |
| **Status** | Draft |
| **Tanggal** | 2026-08-31 |
| **Pilot** | Kota Bandung |

---

## 1. Latar Belakang & Masalah

Saat ini Navisha memiliki dua fitur AI yang membutuhkan data tempat yang bisa dipercaya:

1. **Autogen** — generate itinerary trip dari deskripsi user.
2. **Summary** — ringkasan trip + tips.

Keduanya saat ini mengandalkan pengetahuan LLM saja. Masalahnya:

- LLM bisa **halusinasi** nama tempat yang tidak ada / sudah tutup / pindah.
- Tidak ada data **rating, harga, jam buka** yang terverifikasi.
- Tidak ada cara menjawab "rekomendasikan tempat lain di Bandung" secara grounded.
- Tidak ada **loop belajar**: sistem tidak tahu tempat mana yang disukai user.

## 2. Goal

Membangun **katalog destinasi per kota** yang dikumpulkan secara semi-otomatis, lalu menggunakannya sebagai sumber data untuk:

1. **Rekomendasi trip** — saat user merencanakan trip (autogen) dan saat menambah activity.
2. **Saran di summary trip** — "next time coba..." berdasarkan apa yang sudah dikunjungi.
3. **Loop feedback** — sistem belajar dari perilaku user tempat mana yang relevan.

### Non-Goals (untuk fase ini)

- ❌ RAG / vector store / embedding.
- ❌ Collaborative filtering berbasis ML (matrix factorization, dsb).
- ❌ Social listening / scraping media sosial.
- ❌ Rekomendasi realtime berbasis lokasi GPS user.
- ❌ Multi-kota sekaligus (pilot hanya Bandung; arsitektur harus mendukung ekspansi).

## 3. Pengguna & Use Case

### UC-1 — Perencanaan trip dengan rekomendasi
User membuat trip "Bandung 3 hari". Saat autogen menyusun itinerary, sistem menyisipkan tempat dari katalog yang **sudah diverifikasi** (rating, kategori, durasi wajar) alih-alih mengandalkan LLM semata.

### UC-2 — Saran saat menambah activity
Saat user menambah activity location di suatu hari, sistem menyarankan tempat dari katalog yang: (a) dekat dengan cluster aktivitas hari itu, (b) kategori yang belum banyak di trip tersebut, (c) rating/popularitas baik.

### UC-3 — Saran "next trip" di summary
Saat summary trip dibuat, sistem melihat kategori & tags yang sudah dikunjungi user, lalu menyarankan tempat dengan tag overlap tinggi yang **belum** ada di trip (anti-join).

### UC-4 — Self-healing katalog
User menambah tempat yang tidak ada di katalog (mis. tempat viral). Sistem mencatatnya sebagai `user-submitted`, memperkaya datanya di job berikutnya, dan tempat itu menjadi bisa direkomendasikan ke user lain.

## 4. Data Destinasi — Apa yang Dibutuhkan

| Field | Contoh | Fungsi |
|---|---|---|
| nama + alias | "Trans Studio Bandung", "TSB" | pencarian |
| koordinat lat/lng | -6.9057, 107.6536 | proximity, clustering per hari |
| kategori | `wisata`, `kuliner`, `cafe`, `belanja`, `alam` | filter |
| sub-tipe | theme-park, museum, taman, kafe | variasi (MMR) |
| rating + jumlah ulasan | 4.6 / 12.400 | kualitas & popularitas |
| price tier | 1–3 (Rp / RpRp / RpRpRp) | cocokkan budget trip |
| jam buka + hari ramai | 10.00–22.00 | scheduling (diambil on-demand) |
| durasi wajar | 120–240 menit | alokasi per hari |
| tags | `ramah-anak`, `instagramable`, `outdoor`, `hemat` | kecocokan preferensi |
| deskripsi singkat | 1–2 kalimat | bahan LLM untuk alasan rekomendasi |

## 5. Sumber Data

| Sumber | Peran | Catatan |
|---|---|---|
| **Geoapify Places API** | Crawl struktur POI (nama, koordinat, kategori) | Sudah terintegrasi di backend (`GeoapifyClient`). Gratis 3.000 req/hari. Tidak ada rating. |
| **Google Places API** | Enrichment: rating, jumlah ulasan, price level, jam buka, foto | Frontend sudah pakai Google Places. Dipanggil hanya untuk POI yang lolos filter. |
| **OpenStreetMap (Overpass)** | Pelengkap landmark/wisata alam | Kualitas data Indonesia tidak merata; hanya pelengkap. |
| **LLM (batch, sekali jalan)** | Generate seed query per kota + derive tags dari taksonomi tetap | Bukan RAG; hanya enrichment saat ingest. |
| **User activity (implicit)** | Ground truth relevansi | Tempat yang di-add user = tervalidasi. Sumber sinyal terkuat. |

## 6. Pipeline Pengumpulan Data (Eksplorasi Kota)

1. **Enumerasi grid** — pecah kota jadi sel (geohash presisi-6 ~1,2 km atau tile radius 3 km) termasuk area penyangga (untuk Bandung: Lembang, Dago, Ciwidey). Query per sel × per kategori supaya hasil tidak bias ke pusat kota.
2. **Dedupe** — dua POI dianggap sama jika jarak < 150 m **dan** nama similarity tinggi (trigram). Union antar sel & antar sumber.
3. **Filter 3 lapis** (menentukan mana yang layak masuk katalog):
   - **Lapis 1 — White-list kategori**: hanya kategori yang berguna untuk wisatawan (`tourism.*`, `amenity.restaurant/cafe`, `leisure.park`, toko oleh-oleh). Membuang ~70–80% POI tanpa perlu "kecerdasan".
   - **Lapis 2 — Sinyal kualitas**: rating ≥ 4.0 dan jumlah ulasan ≥ threshold **per kategori** (50 untuk restoran, lebih rendah untuk museum). Hidden gem: rating ≥ 4.3 tapi ulasan < 100 diberi flag khusus, jangan terbuang oleh filter jumlah ulasan.
   - **Lapis 3 — Ground truth user**: tempat yang pernah di-add user sebagai activity otomatis naik prioritasnya.
4. **Enrichment** — POI yang lolos (~1.000–3.000 untuk Bandung) dipanggil Google Place Details untuk rating/harga/jam buka.
5. **Tagging** — LLM batch assign tags dari **taksonomi tetap** (bukan free-form, supaya bisa difilter SQL).
6. **Simpan + refresh terjadwal**.

> **Prinsip**: crawl menghasilkan *kandidat* (recall tinggi, presisi rendah — tidak apa-apa). Relevansi sesungguhnya dijawab terus-menerus oleh perilaku user, bukan saat crawling.

## 7. Logika Rekomendasi (Tanpa RAG)

Urutan dari paling simpel; pilot memakai Opsi A + B:

### Opsi A — SQL scoring murni (inti)
Prefilter WHERE (kategori, area, budget, rating minimum) lalu ORDER BY skor tertimbang:

```
score(d) = w1·rating(d) + w2·pop(d) + w3·tagSim(d, u) + w4·budgetFit(d) + w5·proximity(d, itinerary)
```

- `rating` pakai **Bayesian average** supaya tempat 5 ulasan ★5 tidak mengalahkan 2.000 ulasan ★4.5: `(C·m + Σr) / (C + n)`
- `tagSim` pakai **Jaccard**: `|A∩B| / |A∪B|` (Postgres: operator `&&` pada array)
- `proximity` = haversine ke akomodasi / cluster hari itu
- `pop` = popularitas **recency-weighted** (lihat §8, review velocity)

### Opsi B — Diversity & clustering
- **MMR (Maximal Marginal Relevance)** setelah sort, supaya hasil tidak 10 tempat kuliner semua.
- Klaster per area (geohash) → per hari trip diisi dari 1 cluster (greedy nearest-neighbor; penyederhanaan Orienteering Problem).

### Opsi C — Text search bawaan Postgres (untuk input teks bebas)
- `tsvector` + `ts_rank` (BM25-like, tf-idf) dengan config `simple` + tabel **synonym/alias** (`{kafe, coffee shop, kedai kopi}`) — Postgres tidak punya stemmer Bahasa Indonesia, kamus synonym beberapa ratus kata sudah cukup.
- `pg_trgm` untuk fuzzy matching typo ("transstudio" vs "Trans Studio").

### Opsi D — Ko-okurensi (fase lanjut)
"Orang yang ke X juga ke Y" — similarity Jaccard antar pasangan destinasi dari data trip yang ada. Murni SQL, tanpa ML.

### Peran LLM
LLM **bukan pencari kandidat** — skor deterministik menyaring 20–50 kandidat, LLM memilih & menjelaskan 5 (re-rank + narasi). Murah, cepat, grounded, bisa dijelaskan.

## 8. Menjaga Data Tetap Relevan (Anti-Drift)

Katalog bilang "top 10 Bandung", tapi realita minggu ini berbeda. Solusinya bukan re-crawl penuh, tapi **loop feedback**:

### 8.1 Implicit feedback (sinyal terkuat)
- Logging: `recommendation_log(trip_id, catalog_id, position, accepted)`.
- **Adoption rate per tempat** = dipakai ÷ muncul di rekomendasi.
- Tempat yang user cari manual tapi tidak ada di katalog → katalog tahu lubangnya di mana.

### 8.2 Review velocity (deteksi tren)
Tempat viral tidak langsung rating tinggi — yang naik duluan **jumlah ulasan**. Refresh bulanan menyimpan `rating_count`, sehingga derivatifnya otomatis:

```
velocity = (review_count_bulan_ini − review_count_bulan_lalu) / umur_tempat(bulan)
```

- Velocity tinggi + rating ≥ 4.2 → kandidat "sedang naik", naikkan bobot popularitas.
- Velocity ≤ 0 beberapa periode → tempat memudar, turunkan otomatis.

### 8.3 Discovery jalur user (self-healing)
Activity user yang tidak match katalog → auto-insert `status='user-submitted'`, diperkaya di job berikutnya. Tempat viral menyebar organik lewat ko-okurensi. Crawl bulanan hanya jaring pengaman.

### 8.4 Sinyal eksternal murah (opsional)
- Google Trends per kota untuk boost **kategori** (musiman), bukan tempat spesifik.
- Google Places popular times (on-demand) untuk pola keramaian.
- Social listening **tidak** di fase ini (mahal, legal abu-abu; sinyal 8.1–8.3 sudah menangkap efek yang sama 2–4 minggu kemudian — cukup untuk perencanaan trip).

## 9. Strategi Update Data

Pisahkan data yang jarang berubah dari yang cepat basi. **Tidak ada re-indexing penuh** — skor dihitung saat query, tidak disimpan.

| Kelas | Field | Refresh | Cara |
|---|---|---|---|
| Struktur (stabil) | nama, koordinat, kategori, tags, deskripsi | per kuartal | re-crawl |
| Sinyal (cepat basi) | rating, jumlah ulasan, price tier | bulanan | UPDATE kolom per ID yang sudah ada (incremental) |
| Operasional (real-time) | jam buka, hari ramai | **tidak disimpan** | diambil on-demand saat render, cache 1 hari |
| Popularitas user | adoption, ko-okurensi | nightly | materialized view / agregasi |

## 10. Metrik Sukses

| Metrik | Rumus | Target pilot |
|---|---|---|
| **Catalog coverage** | % activity user yang match ke katalog | ≥ 70% untuk Bandung |
| **Recommendation acceptance** | % rekomendasi yang di-accept | ≥ 25% |
| **Katalog aktif** | jumlah entri lolos filter 3 lapis | 1.000–3.000 untuk Bandung |
| **Freshness** | % entri dengan sinyal < 60 hari | ≥ 90% |
| **Audit manual** | error rate sampel 20 top-rekomendasi | < 10% |

## 11. Milestone

| Fase | Isi | Keluaran |
|---|---|---|
| **M1** | Backfill Bandung: crawl → dedupe → filter → enrich → CSV/DB | Katalog mentah + laporan kualitas |
| **M2** | Skema DB + recommendation usecase (Opsi A + B) + API | `GET /recommendations` |
| **M3** | Integrasi autogen + summary (grounding kandidat) | Itinerary & summary memakai katalog |
| **M4** | Feedback loop: `recommendation_log`, adoption rate, review velocity, self-healing | Loop tertutup |
| **M5** | Ekspansi kota + Opsi C/D (text search, ko-okurensi) | Multi-kota |

## 12. Risiko & Mitigasi

| Risiko | Mitigasi |
|---|---|
| Kualitas Geoapify untuk POI Indonesia rendah | Google Places sebagai enrichment wajib; OSM hanya pelengkap |
| Kuota API habis saat crawl | Rate-limit crawler, cache hasil per sel, crawl di luar jam sibuk |
| Katalog basi tanpa disadari | Metrik freshness + audit manual berkala (§10) |
| Rekomendasi monoton (1 kategori) | MMR + constraint variasi kategori per hari |
| Tempat tutup/pindah | Deteksi via rating anjlok + audit; status `inactive` tanpa menghapus |
