# Checklist QA di device asli

> Pasangan dari tes otomatis (plan D6). Playwright + axe sudah memeriksa alur utama dan aksesibilitas
> (`.github/workflows/e2e.yml`, manual dan tiap malam). Checklist ini untuk hal yang hanya terasa di HP sungguhan.
> Jalankan di **satu Android dan satu iPhone** sebelum rilis besar, idealnya di jaringan seluler.

Catat hasil sebagai ✅ / ❌ + catatan singkat (model HP, browser, langkah yang gagal).

## Navigasi & layout
- [ ] Bottom bar di dalam trip tidak tertutup home indicator / gesture bar (safe area), dan tidak ikut naik saat keyboard terbuka.
- [ ] Tidak ada scroll ke samping di halaman mana pun (Trips, Itinerary, Map, Bookings, Budget, Summary, Share).
- [ ] Tombol back browser / gesture back kembali ke halaman sebelumnya, tidak keluar dari app.

## Form & sheet
- [ ] Sheet (Add activity, Add expense, Add transport, Add stay, Set budget) muncul dari bawah, bisa di-scroll sampai tombol simpan, dan tombol simpan tidak tertutup keyboard.
- [ ] Keyboard yang muncul sesuai: angka untuk Amount/Budget, tanggal/jam memakai picker bawaan HP.
- [ ] Autocomplete lokasi: daftar saran bisa dipilih dengan satu ketukan, tidak tertutup keyboard.
- [ ] Semua tombol dan chip mudah diketuk dengan jempol (tidak ada yang terasa terlalu kecil atau berdempetan).

## Itinerary
- [ ] Drag & drop urutan activity bekerja dengan jari (tekan ikon di rail lalu geser), halaman tidak ikut ter-scroll.
- [ ] Hapus activity / expense / transport / stay → toast **Undo** muncul; Undo mengembalikan item; tanpa Undo item benar-benar hilang setelah ±6 detik dan tidak muncul lagi setelah reload.
- [ ] Hapus lalu langsung pindah aplikasi / kunci layar → setelah kembali, item tetap terhapus (tidak "hidup lagi").

## Peta
- [ ] Peta bisa digeser dan di-zoom dengan dua jari; ketuk marker menyorot baris di daftar dan sebaliknya.
- [ ] Tombol buka di Google Maps membuka aplikasi Google Maps (bukan halaman kosong).

## Share & AI
- [ ] Link share yang ditempel di WhatsApp menampilkan judul, tanggal, dan foto trip (preview).
- [ ] Link share dibuka di HP lain tanpa login: itinerary langsung tampil, tanpa skeleton lama.
- [ ] Generate trip dengan AI di jaringan seluler: indikator proses terlihat, tidak ada timeout di tengah, hasil draft bisa dipilih lalu dibuat jadi trip.

## Tampilan
- [ ] Mode gelap HP (dark mode): teks tetap terbaca, tidak ada kotak putih menyilaukan.
- [ ] Teks sekunder (abu-abu) tetap terbaca di luar ruangan / kecerahan rendah.
