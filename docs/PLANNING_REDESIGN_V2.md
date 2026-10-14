# Planning — Redesign V2 (visual berkarakter)

> **Tanggal:** 2026-10-14
> **Status:** V0–V4 selesai (PR #49–#57, bertumpuk; merge berurutan). Berikutnya: V5 (backend pendukung) dan V6 (QA).
> **Konteks:** Redesign pertama ([PLANNING_REFACTOR_REDESIGN.md](PLANNING_REFACTOR_REDESIGN.md) bagian B) membuat UI konsisten dan bersih, tapi sengaja netral (Inter saja, biru solid, latar polos). Hasilnya rapi namun generik. V2 memberi Navisha **identitas visual**.

## Tujuan

- Visual yang menarik dan **berkarakter** (bisa dikenali tanpa logo).
- **Minim whitespace**: layout padat, pakai lebar layar penuh, informasi berdampingan.
- **Light + dark mode** sejak awal.
- Logo/brand boleh berubah.
- Tetap mempertahankan yang sudah benar: aksesibilitas (kontras AA, target sentuh 44px di mobile, focus ring), token tanpa hex di komponen, palet kategori expense, primitive coss ui.

## Keputusan (2026-10-14)

| # | Keputusan |
|---|---|
| 1 | Mulai dari V0: eksplorasi 3 arah visual dengan prototipe. |
| 2 | Dark mode dikerjakan sekarang. |
| 3 | Logo/brand boleh diubah. |
| 4 | Screenshot memakai data asli (backend + frontend lokal). |
| 5 | Referensi dicari dari berbagai sumber. |
| 6 | Fondasi desain ditulis di `docs/DESIGN.md`. |
| 7 | **Arah final: Soft** (ronde 4). Layout: top bar + hero cover + tab pill (desktop), split itinerary/peta, nav mengambang di mobile. |
| 9 | **Tema bawaan light.** Dark hanya jika dipilih user (tidak mengikuti OS). |
| 8 | Cover: pakai katalog yang ada; trip tanpa cover memakai **cover default** (prompt di [design/COVER_PROMPTS.md](design/COVER_PROMPTS.md)), sementara fallback CSS navy. |

## Log eksplorasi

| Ronde | Isi | Masukan |
|---|---|---|
| 1 | A Departure Board, B Field Journal, C Postcard Pop (`design-audit/v2-directions/`) | A terlalu kaku, kuning tidak cocok |
| 2 | D Atlas (teal + coral), E Senja (indigo + peach), versi lebih tenang | Terlalu ramai, bikin pusing, masih kaku |
| 3 | Evolusi **biru** yang sekarang + 3 layout navigasi: sidebar, top bar + hero, peta penuh (`design-audit/v2-blue/`) | Layout 2 dan 3 menarik. User memberi 7 referensi (`design-audit/references/`) |
| 4 | Biru + gaya referensi: sudut sangat bulat, cover ilustrasi, judul dua nada, tanggal lingkaran, boarding pass, nav gelap mengambang; hero (L2) + peta (L3) (`design-audit/v2-trip/`) | Desktop sudah sangat oke. Ditambah 4 opsi: Senja Biru, Soft, Ocean, Clean → **Soft dan Clean** paling disukai. Ilustrasi cover harus umum (bukan masjid); masjid diganti gunung, laut, dan pesawat |

Ronde 4 lanjutan: mockup memakai 5 cover asli dari katalog (`design-audit/v2-trip/covers/`) dan opsi warna **Dusk** yang palet-nya diambil dari cover (navy #0E2B53, biru laut #1D5FAE, aksen peach #F4A26B). Generator gambar Figma **tidak dipakai** atas permintaan user; 4 gambar yang sempat dibuat tidak digunakan. Trip tanpa cover memakai fallback navy + cahaya senja.

Backend boleh disesuaikan untuk kebutuhan redesign (misalnya cover otomatis, foto tempat, detail tiket, status kesiapan).

Pelajaran: user lebih suka **evolusi** daripada identitas baru yang drastis. Yang diinginkan adalah tampilan yang lembut, bulat, satu warna utama, dan tidak "berisik".

## Fase (diperbarui untuk Soft)

| Fase | Isi | Hasil |
|---|---|---|
| V0 ✅ | Riset, baseline, 4 ronde mockup, DESIGN.md, prompt cover | Arah Soft |
| V1 ✅ #49 | Fondasi: token light/dark §2, Nunito + Nunito Sans, radius §4.1, shadow, toggle tema (**bawaan light**, dark opsional; cookie, tanpa kedip), `/dev/ui` | Token + katalog |
| V2 ✅ #50 | Primitive dan komponen inti §5: Button pill, TabPills, Chip, Card, DateCircles, TimePills, BoardingPass, FactBox, CoverButton, BottomSheet, BudgetMeter | `/dev/ui` |
| V3 ✅ #51 | Shell: top bar desktop, FloatingNav mobile (global vs trip), TripCover + hero dengan tab menempel, fallback cover, theme toggle | |
| V4 ✅ #52–#57 | Halaman: Trip Itinerary (split + peta) → Peta mobile (sheet) → Beranda/Trips → Bookings (BoardingPass) → Budget → Ringkasan → Share → Landing + Login | 1 PR per halaman |
| V5 | Backend pendukung: cover default di resolver, field tiket (kursi/gate/terminal/kode booking), status kesiapan per hari, foto tempat (opsional, ada biaya) | Migrasi dikoordinasikan (DB lokal = prod) |
| V6 | QA: visual regression vs `design-audit/v2-baseline`, axe light & dark, device asli | |

Setiap fase dijelaskan dulu dan menunggu persetujuan sebelum dikerjakan.
