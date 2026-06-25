package summary

// localTips is a curated list of Indonesian travel tips injected into
// AI-generated trip summaries for variation (Phase 3E).
// Each summary gets 1-2 randomly selected tips from this pool.
var localTips = []string{
	"Selalu bawa uang tunai secukupnya — tidak semua warung atau pasar tradisional terima QRIS.",
	"Pakai sunscreen! Matahari tropis Indonesia bisa bikin kulit terbakar hanya dalam 30 menit.",
	"Coba naik Gojek atau Grab buat eksplorasi kota — lebih murah dan praktis daripada taksi konvensional.",
	"Jangan lupa cobain sarapan khas daerah yang kamu kunjungi — bubur ayam, nasi uduk, atau nasi pecel.",
	"Bawa botol minum sendiri. Air minum isi ulang gampang ditemukan dan lebih ramah lingkungan.",
	"Kalau ke pantai, hindari musim hujan (Oktober–Maret) karena ombak bisa lebih besar dan air keruh.",
	"Belajar beberapa kata dalam bahasa lokal — 'suwun' (Jawa), 'matur suksma' (Bali), 'hatur nuhun' (Sunda) dihargai banget!",
	"Jangan tawar terlalu rendah di pasar tradisional — tawar wajar dan tetap ramah.",
	"Bawa jaket tipis! AC di transportasi umum dan mal bisa sangat dingin.",
	"Foto KTP/paspor di HP kamu. Berguna banget kalau dokumen fisik hilang atau tertinggal.",
	"Di Bali, hormati aturan berpakaian saat masuk pura — pakai sarung dan selendang yang biasanya disediakan di depan.",
	"Traffic jam di Jakarta dan Bali bisa GILA. Rencanakan perjalanan dengan buffer waktu minimal 1 jam.",
	"Hati-hati dengan 'guides' freelance yang menawarkan jasa di depan objek wisata. Pakai guide resmi saja.",
	"Download peta offline di Google Maps sebelum berangkat — sinyal di daerah terpencil kadang hilang.",
	"Kulineran di kaki lima itu SURGA. Tapi perhatikan kebersihan: cari yang ramai pembeli, artinya makanan fresh.",
	"Musim kemarau (April–September) adalah waktu terbaik buat hiking dan pantai di sebagian besar Indonesia.",
	"Ada 'jam buka' dan 'jam rame'. Datang pagi-pagi sebelum jam 9 buat nikmatin tempat wisata tanpa antrian.",
	"Simpan nomer darurat: 112 (umum), 110 (polisi), 118 (ambulans), 113 (pemadam kebakaran).",
	"Currency exchange resmi lebih aman daripada money changer pinggir jalan — cek kurs terkini dulu.",
	"Internet di kafe dan coworking space biasanya lebih kencang daripada hotel. Cocok buat digital nomad!",
	"Pesan hotel dengan 'free cancellation' — itinerary bisa berubah dan fleksibilitas itu penting.",
	"Kopi Indonesia itu LEGENDARIS. Coba kopi luwak (Bali/Jawa), kopi gayo (Aceh), atau kopi toraja (Sulawesi).",
	"Waspada 'extra charge' di restoran — beberapa tempat nambah pajak 10-21%. Selalu cek struk sebelum bayar.",
	"Beli SIM card lokal di airport atau convenience store. Telkomsel punya coverage paling luas di daerah terpencil.",
	"Gunung berapi aktif itu indah, tapi cek status erupsi dulu di website PVMBG sebelum hiking.",
	"Di Yogyakarta, siapin uang receh buat parkir — hampir semua tempat parkir masih manual dan murah (Rp 2.000-5.000).",
	"Pakai sandal jepit yang nyaman — budaya Indonesia banyak lepas sepatu, terutama masuk rumah/akomodasi lokal.",
	"Alfamart dan Indomaret BUKA 24 JAM dan ADA DI MANA-MANA. Lifesaver buat kebutuhan darurat tengah malam.",
	"Jangan minum air keran. Selalu minum air kemasan atau air matang.",
	"Belajar naik TransJakarta atau MRT — transportasi publik murah, ber-AC, dan makin modern.",
	"Bawa powerbank! Hari yang panjang dengan foto-foto dan Google Maps bakal habisin baterai HP kamu.",
	"Coba aktivitas yang UNIK untuk destinasi itu: snorkeling di Raja Ampat, sunrise di Bromo, river tubing di Ubud.",
	"Di Lombok, siapkan fisik kalau mau ke air terjun — biasanya ada banyak tangga turun (dan harus naik lagi).",
	"Food court di mall seringkali punya versi 'aman' dari street food — enak buat yang baru pertama coba kuliner Indonesia.",
	"Pagi hari adalah golden hour buat foto — cahaya lembut, tempat belum ramai, dan udara masih sejuk.",
	"Biasakan cek rute dan ongkos Gojek/Grab sebelum berangkat — harga surge saat hujan atau jam sibuk bisa 2-3x lipat.",
	"Jajan di angkringan (gerobak kaki lima khas Jogja) — nasi kucing, sate usus, dan wedang jahe. Atmosfernya nggak ada duanya!",
	"Kalau kamu Muslim, cari tahu masjid terdekat dari itinerary kamu — hampir setiap daerah punya masjid besar yang nyaman.",
	"Bawa obat nyamuk! Beberapa daerah (terutama dekat sawah atau hutan) masih banyak nyamuk di malam hari.",
	"Pakai Reef-safe sunscreen kalau snorkeling atau diving — lindungi terumbu karang Indonesia yang cantik!",
	"Bahasa isyarat + senyum = komunikasi universal. Banyak orang Indonesia yang ramah meskipun nggak bisa bahasa Inggris.",
	"Pasar pagi tradisional adalah jendela ke budaya lokal. Datang jam 5-7 pagi buat lihat aktivitas paling sibuk.",
	"Di Bali selatan (Seminyak/Canggu), macet bisa 2 jam cuma buat 10 km. Sewa motor jauh lebih praktis.",
	"Booking tiket kereta api (KAI) via Access by KAI app — lebih murah dan bisa pilih kursi. KA eksekutif recommended!",
	"Museum di Indonesia makin keren! Museum Macan (Jakarta), Museum Angkut (Malang), Museum Ullen Sentalu (Jogja).",
	"Es kelapa muda adalah minuman penyelamat setelah seharian panas-panasan. Dijamin segar dan natural!",
	"Bawa tas lipat ekstra — belanja di pasar atau toko oleh-oleh biasanya pakai kantong plastik, lebih baik bawa sendiri.",
	"Siapin mental buat 'jam karet' — konsep waktu di Indonesia lebih santai. Nikmati aja, jangan stres!",
	"Sunset di Bali Selatan (Uluwatu, Jimbaran) vs sunrise di Bali Timur (Sanur) — pilih itinerary biar dapat keduanya!",
	"Selalu pastikan kamu tau lokasi klinik atau rumah sakit terdekat dari penginapanmu. Safety first!",
}

// pickTips deterministically selects up to n tips from the pool based on a seed.
// Uses simple modulo-based selection for reproducibility.
func pickTips(seed uint32, n int) []string {
	if n <= 0 || len(localTips) == 0 {
		return nil
	}
	if n > len(localTips) {
		n = len(localTips)
	}
	out := make([]string, 0, n)
	for i := 0; i < n; i++ {
		idx := (int(seed) + i*17) % len(localTips)
		out = append(out, localTips[idx])
	}
	return out
}
