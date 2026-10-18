# Navisha Copy Guide

> Aturan menulis teks di UI. Bahasa UI: **English** (keputusan 2026-10-13). Pasangan dari [DESIGN.md](DESIGN.md).

## 1. Glosarium

Satu istilah untuk satu konsep, dipakai sama di tab, judul, tombol, dan pesan.

| Pakai | Jangan pakai | Arti |
|---|---|---|
| **Trip** | Adventure, Journey | Satu perjalanan. |
| **Trips** | My Trips, Dashboard, Home | Halaman daftar trip (home setelah login). |
| **Day** | | Satu hari dalam trip. |
| **Itinerary** | Plan, Schedule | Daftar hari + aktivitas. |
| **Activity** | Item, Event | Isi itinerary (location, note, to-do). |
| **Transport** | Transportation, Travel | Penerbangan, kereta, bus, dst. |
| **Stay** | Accommodation, Hotel, Lodging | Tempat menginap. |
| **Bookings** | Logistics | Gabungan Transport + Stay (tab baru, D3). |
| **Expense** | Spending, Cost | Satu pengeluaran. |
| **Budget** | Expenses (sebagai nama tab) | Tab ringkasan + daftar expense. |
| **Base currency** | Main currency, Trip currency | Mata uang yang dipakai untuk total. |
| **Generate with AI** | Plan with AI, AI Magic | Titik masuk fitur AI. |

Kategori expense: Stay, Transport, Food, Activity, Gift, Shopping, Other.

## 2. Tombol

- Kata kerja + objek: **Add expense**, **Save changes**, **Delete trip**, **Generate itinerary**.
- Hindari: Submit, OK, Confirm, Yes, Go.
- Sentence case: "Add expense", bukan "Add Expense".
- Tombol hapus menyebut objeknya: "Delete stay", bukan "Delete".

## 3. Judul & label

- Sentence case di semua judul: "Budget overview", "Recent expenses".
- Label form singkat, tanpa titik dua: "Title", "Start date".
- Placeholder memberi contoh, bukan instruksi ulang label: `e.g. Tokyo, Japan`.
- Opsional ditandai "(optional)", wajib tidak diberi tanda bintang kecuali form panjang.

## 4. Pesan status

| Jenis | Pola | Contoh |
|---|---|---|
| Error | Apa yang terjadi + apa yang bisa dilakukan | "Couldn't load exchange rates. Showing amounts in the original currency." |
| Error simpan | Apa yang gagal + tidak ada yang berubah | "Couldn't change the base currency. Nothing was changed, try again later." |
| Sukses | Fakta singkat, tanpa tanda seru | "Expense added." |
| Undo | Aksi + tombol | "Activity deleted. **Undo**" |
| Empty state | 1 kalimat penjelasan + 1 CTA | "No stays yet. Add where you're sleeping each night." → **Add stay** |

Hindari "Something went wrong", "Oops!", "Whoops", dan emoji di pesan error.

## 5. Angka, tanggal, uang

- Uang: selalu dengan kode/simbol mata uang, tanpa sen untuk IDR, JPY, KRW, VND (`Rp 68,340,304`, `¥12,000`), dua desimal untuk USD, EUR, SGD, MYR, THB.
- Tanggal di kartu: `10 May – 19 May 2026`. Tanggal tunggal: `Sun, 10 May`.
- Durasi: `10 days · 9 nights`.
- Status trip: **Upcoming**, **In progress** (hari ke-N dari M), **Completed**. Jangan "in progress" untuk trip yang sudah selesai.

## 6. Nada

- Menyebut aksi dan fakta, bukan slogan. Ganti "Own every moment" dengan manfaat konkret: "Plan each day, see it on a map, and track spending in your currency."
- Tanpa klaim yang tidak bisa dibuktikan ("10,000+ trips planned this month").
- Sapaan secukupnya; satu sapaan di dashboard sudah cukup.
