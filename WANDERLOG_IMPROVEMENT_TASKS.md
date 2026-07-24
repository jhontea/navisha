# Wanderlog-Inspired Improvement Tasks

Backlog hasil eksplorasi langsung Wanderlog (https://wanderlog.com) pada 2026-07-23. Dipisah dari `HOLICAY_IMPROVEMENT_TASKS.md` agar sumber inspirasi jelas. Item yang tumpang tindih dengan backlog Holicay ditandai dengan `[overlap: XXX-NN]`.

> **Catatan prioritas:** Wanderlog adalah produk matang dengan 1 juta+ user. Banyak fitur di sini sudah ada di backlog Holicay — fokuskan implementasi pada item yang **belum ada** atau **bisa diperdalam** dari yang sudah direncanakan.

---

## Ringkasan Fitur Wanderlog yang Dieksplorasi

| Area | Yang ditemukan |
|------|----------------|
| **Home/Dashboard** | Carousel trip upcoming + "Recently viewed", world map visited places, achievement badge ("Roaming Voyager", "4 Countries 13 Cities"), hotel search widget inline, popular destinations carousel dari user-generated guides |
| **Trip detail** | Sidebar tab: Overview, Explore, Notes, Flights, Transit, Places to visit, Itinerary (per-day), Budget. Reservations & attachments section. Undo/Redo. Copy/Move places. Map layers toggle per category. |
| **Itinerary** | Per-day cards dengan "Auto-fill day" + "Optimize route" (Pro). Subheading per day. Reorder drag. Add note + Add checklist per day. Recommended places carousel. Chrome extension CTA. |
| **Budget** | Add expense modal: amount + currency selector, category, "Paid by" (tripmate), "Split" (Individuals/Everyone/Don't split), date optional. Set budget, Group balances, View breakdown, Add tripmate. |
| **AI Assistant** | Chat panel terpisah, contoh prompt chips, attach files, "10 free messages" quota, output dengan **nama tempat sebagai tombol interaktif** yang bisa di-add ke trip, "Places from AI" layer di map. |
| **Travel Guides** | User-generated, table of contents per section, map layers per section, likes/views counter, author profile, share. |
| **Hotels** | Aggregator (Airbnb, Booking, Expedia, Hotels.com, Google), price drop alerts, full total upfront (no hidden fees), transparent ranking, compare location vs planned places. |
| **Deals** | Pro-only deals (Hertz, Avis, Budget, Enterprise rental cars, flights, hotels). |
| **Profile** | Followers/Following, visited places map, achievement badges, share profile. |
| **Trip creation** | Minimal: Where to + Dates (optional) + Invite tripmates + Start planning. |

---

## Trip Planning & Itinerary

- [ ] **W-PLAN-01 — Itinerary/map split view (desktop)** `[overlap: PLAN-01]`: Wanderlog menampilkan itinerary list dan map berdampingan secara permanen di desktop, bukan toggle. Klik item itinerary → map zoom ke pin terkait. **Rekomendasi:** jadikan split view default di breakpoint desktop, bukan tab terpisah.

- [ ] **W-PLAN-02 — Auto-fill day dengan AI** `[overlap: AI-01]`: Tombol "Auto-fill day" per hari yang mengisi hari kosong dengan rekomendasi AI berdasarkan destinasi. Berbeda dari regenerate full day — ini mengisi slot kosong tanpa menyentuh aktivitas existing.

- [ ] **W-PLAN-03 — Optimize route per day (Pro-tier candidate)** `[overlap: PLAN-04]`: Tombol "Optimize route" yang menyusun ulang urutan aktivitas dalam satu hari berdasarkan jarak/waktu tempuh minimal. Bisa jadi fitur premium Navisha.

- [ ] **W-PLAN-04 — Subheading per day**: Field "Add subheading" di setiap day card (mis. "Morning: City tour", "Afternoon: Beach"). Saat ini Navisha punya `Day.title` — pertimbangkan subheading kedua untuk segmentasi dalam hari.

- [ ] **W-PLAN-05 — Add note & Add checklist per day**: Selain note, Wanderlog punya checklist item (mis. "Bawa sunblock", "Booking restoran"). **Rekomendasi:** tambahkan tipe item `checklist` di level day, bukan hanya `note`.

- [ ] **W-PLAN-06 — Recommended places carousel per trip**: Carousel horizontal rekomendasi tempat relevan dengan destinasi trip (Pahawang Island, Mutun Beach, dst). User klik → add ke list. **Rekomendasi:** gunakan Google Places API untuk auto-suggest berdasarkan destinasi trip.

- [ ] **W-PLAN-07 — Reservations & attachments hub**: Section terpisah yang meng-agregat Flight, Lodging, Rental car, Train, Attachment, Other dalam satu blok dengan badge count. Saat ini Navisha punya transportation & accommodation terpisah — pertimbangkan unified "Reservations" view.

- [ ] **W-PLAN-08 — Undo/Redo global**: Wanderlog punya tombol Undo/Redo di topbar dengan state "Saved". **Rekomendasi:** implement command pattern / history stack untuk operasi itinerary (add/move/delete activity).

- [~] **W-PLAN-09 — Copy/Move places antar list**: Multi-select places → Copy to / Move to list lain. Berguna saat reorganisasi itinerary.
  - ✅ **Copy** (done): Select mode + checkbox per activity, "Copy to…" dropdown (target day picker), loop `activityApi.create` per selected. Validated: 4 activities Day 1 → Day 2, payload (location/coords/desc) preserved, times preserved.
  - ⏳ **Move** (deferred): Butuh backend endpoint `POST /activities/:id/move {target_day_id}` atau extend `UpdateInput` dengan `day_id`. UI: dropdown "Move to…" konsisten dengan Copy. Drag-and-drop cross-day di-skip (butuh lift DndContext ke parent, high risk).
- [ ] **W-PLAN-10 — Map layers toggle per category**: Toggle layer Flights, Transit, Places to visit, dst. di map. Filter tanpa menghilangkan konteks. `[overlap: PLAN-03]`

---

## AI Assistant

- [ ] **W-AI-01 — Chat panel terpisah**: AI Assistant sebagai panel chat dedicated (bukan modal), bisa tetap terbuka saat user edit itinerary. Saat ini Navisha punya `GenerateChatWizard` — pertimbangkan versi persistent sidebar.

- [x] **W-AI-02 — Interactive place chips in AI output**: Output AI menampilkan nama tempat sebagai **tombol yang bisa diklik** untuk langsung add ke itinerary. Ini killer feature — mengurangi friction dari "AI suggest" → "user add". `[overlap: AI-03, perlu diperdalam]` ✅ Done: `DraftPreview` sekarang curation surface — setiap aktivitas jadi toggleable chip (check + MapPin), counter "X / Y tempat dipilih", toggle per-hari + global, "Create Trip" disable saat 0 selected, draft di-filter client-side sebelum resolve+create. `suggestionKey` diekstrak ke `lib/suggestionKey.ts` (dipakai bareng `DayAIPlanner`).

- [ ] **W-AI-03 — "Places from AI" map layer**: Tempat yang disebut AI muncul sebagai layer terpisah di map, bisa di-toggle. Visual bridge antara chat dan map.

- [ ] **W-AI-04 — Example prompt chips**: Quick-start prompt buttons ("Best places to eat in X", "3 day itinerary to X", "Top attractions in X"). Reduksi cold-start problem.

- [~] **W-AI-05 — Usage quota display**: "10 free messages left" + "Get more". **Rekomendasi:** jika Navisha monetisasi AI, tampilkan quota jelas. Free tier dengan upgrade path.
  - ✅ **Done**: Shared daily quota — all AI features (trip generate, build-around, summary) share one Redis counter (`ratelimit:autogen:daily:{userID}:{date}`). Limit from DB `app_settings.autogen_daily_quota` (default 10). `GET /api/v1/autogen/quota` endpoint. `QuotaBadge` component on generate page + summary card. Refund on LLM failure (`ErrLLMUnavailable`). Redis docs for manual reset.
  - 📝 **Redis reset**: `redis-cli DEL "ratelimit:autogen:daily:{USER_ID}:{YYYY-MM-DD}"`

- [ ] **W-AI-06 — Attach files to AI chat**: Upload receipt/booking PDF untuk di-parse AI. Bisa auto-extract expense atau reservation.

- [ ] **W-AI-07 — Conversation history per trip**: "New chat" button + history chat per trip. User bisa lanjut konteks percakapan sebelumnya.

---

## Budget & Group Trip

- [ ] **W-BUD-01 — Expense modal dengan payer + split**: Form expense satu modal: amount + currency selector, category, **Paid by** (pilih tripmate), **Split** (Individuals/Everyone/Don't split), date optional. `[overlap: GROUP-02, GROUP-03]`

- [ ] **W-BUD-02 — Currency selector per expense**: Tombol currency (Rp/USD/JPY) di setiap expense. Navisha sudah punya currency conversion — pastikan UX-nya se-simple Wanderlog (1 klik ganti currency).

- [ ] **W-BUD-03 — Group balances / settlement**: "Group balances" button yang tampilkan siapa owe siapa. "View breakdown" untuk breakdown per category/payer. `[overlap: GROUP-04]`

- [ ] **W-BUD-04 — Add tripmate dari budget section**: Invite tripmate langsung dari panel budget, bukan harus ke settings trip. `[overlap: GROUP-01]`

- [ ] **W-BUD-05 — Set budget target**: Tombol "Set budget" yang set total budget trip → progress bar pengeluaran vs budget. Navisha sudah punya `Trip.budget` — pastikan ada progress indicator visual.

- [x] **W-BUD-06 — Sort expenses**: "Sort: Date (newest first)" dengan opsi ganti sort (date, amount, category). ✅ Done: `ExpenseSection.tsx` — native `<select>` dengan 5 mode (Date newest/oldest, Amount high→low/low→high, Category A→Z). Mode tanggal tetap grouped per-tanggal (dengan collapse); mode amount/category flatten jadi single list dengan tanggal ditampilkan di sub-line kartu. Default `date-desc` (perilaku sebelumnya). Tidak persist (reset setiap buka halaman).

---

## Discovery & Social

- [ ] **W-DISC-01 — User-generated travel guides**: User publish itinerary sebagai public guide dengan likes/views counter, author profile, table of contents. **Ini fitur besar** — Wanderlog jadi content platform + tool. `[overlap: DISC-01, DISC-02]`

- [ ] **W-DISC-02 — Guide table of contents + map layers per section**: Guide dipecah per section (Tokyo attractions, Kyoto day trips, dst), masing-masing punya map layer toggle. Navigasi TOC di sidebar.

- [ ] **W-DISC-03 — Popular destinations carousel di home**: Featured guides dari user lain di home page → discovery loop.

- [ ] **W-DISC-04 — Profile page dengan visited places map**: World map dengan pin semua tempat yang pernah dikunjungi user + achievement badge ("Roaming Voyager", "4 Countries 13 Cities"). **Gamification kuat** untuk retention.

- [ ] **W-DISC-05 — Followers/Following system**: Social graph antar user. Follow author guide favorit.

- [ ] **W-DISC-06 — Share trip/guide dengan share button prominent**: Setiap trip card punya tombol Share. `[overlap: PLAN-05, sudah ada TripShareDialog]`

---

## Hotels & Bookings

- [ ] **W-HOTEL-01 — Hotel aggregator**: Search hotel + Airbnb dalam satu query, compare Booking/Expedia/Hotels.com/Google. **Fitur besar dengan integrasi third-party** — mungkin terlalu berat untuk Navisha MVP, tapi bisa jadi roadmap jangka panjang.

- [ ] **W-HOTEL-02 — Price drop alerts**: Notifikasi saat harga hotel turun. Butuh background job monitoring.

- [ ] **W-HOTEL-03 — Full total upfront (no hidden fees)**: Tampilkan harga final termasuk fees di search result. UX trust builder.

- [ ] **W-HOTEL-04 — Compare hotel location vs planned places**: Overlay hotel di map itinerary, lihat kedekatan dengan aktivitas. `[overlap: bisa integrasi dengan accommodation feature Navisha]`

- [ ] **W-HOTEL-05 — Manage bookings page**: Halaman kelola semua booking hotel user. `[overlap: W-PLAN-07 Reservations hub]`

---

## Deals & Monetization

- [ ] **W-MON-01 — Pro tier dengan deals**: Deals page dengan Pro-only deals (rental cars, flights, hotels). **Model monetisasi** — Navisha bisa explore partnership affiliate.

- [ ] **W-MON-02 — Pro features gating**: "Optimize route Pro", "Live flight updates Pro", "Export Pro". Identifikasi fitur yang bisa di-gate di Navisha (AI quota, optimize route, export PDF).

- [ ] **W-MON-03 — Browser extension**: Chrome extension untuk add places dari web mana saja. "Add places from anywhere on the web". **Channel acquisition** — capture user saat browsing Tripadvisor/blog travel.

---

## Trip Creation UX

- [ ] **W-CREATE-01 — Minimal trip creation**: Hanya "Where to?" + Dates (optional) + Invite tripmates. Tidak ada form panjang di awal. **Rekomendasi:** Navisha saat ini mungkin terlalu banyak field di TripForm — pertimbangkan progressive disclosure, field wajib hanya destination + dates.

- [ ] **W-CREATE-02 — Invite tripmates di flow creation**: Bisa invite friend sebelum trip dibuat. `[overlap: GROUP-01]`

- [ ] **W-CREATE-03 — "Or write a new guide" path**: Dua entry point — "Start planning" (trip) vs "Write a new guide" (content). `[overlap: W-DISC-01]`

---

## Home/Dashboard

- [ ] **W-HOME-01 — Upcoming trips carousel**: Carousel horizontal trip upcoming dengan cover image, dates, place count, share button. Lebih visual dari list biasa.

- [ ] **W-HOME-02 — World map visited places**: Map global dengan semua tempat yang pernah dikunjungi user. Visual identity + gamification. `[overlap: W-DISC-04]`

- [ ] **W-HOME-03 — Achievement badges**: "Roaming Voyager", "4 Countries 13 Cities & regions". Gamifikasi untuk drive engagement.

- [ ] **W-HOME-04 — Inline hotel search widget**: Widget "Need a place to stay?" di home dengan Where/When/Travelers. Cross-sell ke hotel search.

- [ ] **W-HOME-05 — "Recently viewed and upcoming" section**: Gabungkan trip yang baru dilihat dan upcoming dalam satu carousel.

- [ ] **W-HOME-06 — New feature banner**: Banner dismissible "NEW FEATURE: Hotel search now includes Airbnb" di atas dashboard. Channel untuk announce fitur baru ke user.

---

## Utility & Export

- [ ] **W-UTIL-01 — Export to PDF (Pro)**: Export itinerary lengkap ke PDF. `[overlap: UTIL-01]`

- [ ] **W-UTIL-02 — Open area in Google Maps**: Link "Open this area in Google Maps" dari map internal. Small but useful.

- [ ] **W-UTIL-03 — Keyboard shortcuts**: Button "Keyboard shortcuts" di map. Power user feature.

- [ ] **W-UTIL-04 — Change language**: Language selector di footer. `[overlap: i18n, belum ada di backlog]`

---

## Prioritas Implementasi Rekomendasi

### P0 — High impact, relatif mudah, belum ada di Navisha
1. **W-AI-02** — Interactive place chips in AI output (killer feature, low effort jika AI output sudah structured)
2. **W-AI-04** — Example prompt chips (reduksi cold-start)
3. **W-PLAN-05** — Add checklist per day (tipe item baru)
4. **W-BUD-01** — Expense modal dengan payer + split (foundational untuk group trip)
5. **W-CREATE-01** — Minimal trip creation (UX win besar)

### P1 — High impact, effort sedang
6. **W-PLAN-01** — Itinerary/map split view desktop `[sudah di PLAN-01]`
7. **W-PLAN-06** — Recommended places carousel per trip
8. **W-PLAN-08** — Undo/Redo global
9. **W-AI-01** — Chat panel terpisah persistent
10. **W-BUD-03** — Group balances / settlement
11. **W-HOME-01** — Upcoming trips carousel
12. **W-HOME-03** — Achievement badges (gamification)

### P2 — Strategic, effort besar, roadmap jangka panjang
13. **W-DISC-01** — User-generated travel guides (content platform play)
14. **W-DISC-04** — Profile page dengan visited places map
15. **W-HOTEL-01** — Hotel aggregator
16. **W-MON-03** — Browser extension
17. **W-PLAN-03** — Optimize route (Pro feature)

---

## Pola UX yang Patent-worthy / Worth Copying

1. **AI output sebagai actionable chips** — bukan plain text. Setiap entitas (tempat) adalah tombol. Ini mengubah AI dari "info source" → "action source".
2. **Map layers per category** — filter tanpa lose context. User bisa lihat hanya flights, hanya transit, dst.
3. **Split view itinerary + map** — permanent di desktop, bukan toggle. Reduksi context switching.
4. **Gamification via visited places map + badges** — drive retention lewat visual progress.
5. **Minimal trip creation** — friction terendah mungkin di onboarding (destination + dates optional).
6. **Reservations hub** — unified view semua booking type di satu section.
7. **Chrome extension** — capture user di luar app, bring back ke trip.

---

## Catatan Teknis (relevan untuk stack Navisha)

- Wanderlog pakai **Stadia Maps + OpenMapTiles + OpenStreetMap** untuk world map (bukan Google Maps) di home/profile. Navisha pakai Google Maps JS API — pertimbangkan cost jika scale.
- AI Assistant pakai **WebSocket** (`wss://wanderlog.com/api/chat/tripPlanAssistant/ws`) untuk streaming response. Navisha bisa pertimbangkan WebSocket/SSE untuk AI streaming.
- Google Maps `Marker` sudah deprecated di Wanderlog (warning di console) — mereka belum migrasi ke `AdvancedMarkerElement`. Navisha bisa langsung pakai `AdvancedMarkerElement` dari awal.
- React hydration error (#418) muncul di guide page — indikasi SSR mismatch. Navisha perlu hati-hati dengan `"use client"` boundary.

---

# Analisis Visual, Design, UI & UX

> Berdasarkan screenshot langsung: landing page, home/dashboard, dan trip detail page. Fokus pada pola yang bisa diadopsi Navisha.

## 1. Design System & Visual Language

### Color Palette
- **Primary: Biru cerah** (`#3b82f6`-ish, mirip "travel blue") — dipakai untuk CTA utama, link, accent. Memberi kesan trustworthy + energetic.
- **Background: Putih bersih** dengan sedikit gray off-white untuk section separator. Sangat clean, content-first.
- **Text: Dark gray/near-black** (`#1f2937`-ish) untuk heading, gray medium untuk body. Kontras tinggi, readable.
- **Accent warna kategori**: setiap tipe item (Flight, Lodging, Transit, Places) punya warna icon berbeda — membantu scanning visual cepat.
- **Pro badge: Amber/gold** — gating premium terlihat premium, bukan mengganggu.

**Rekomendasi Navisha:** Saat ini Navisha pakai Tailwind + coss ui. Pertimbangkan:
- Definisikan **1 primary color** kuat (biru atau warna brand Navisha) untuk semua CTA utama — konsistensi.
- Tambahkan **semantic color per kategori** (transport=blue, accommodation=purple, food=orange, activity=green, souvenir=pink) — sudah ada `categoryColors.ts`, pastikan diterapkan konsisten di icon + badge + map marker.

### Typography
- **Sans-serif modern** (kemungkinan Source Sans Pro / system font stack). Heading bold, body regular.
- **Hierarchy jelas**: H1 besar untuk trip title, H2 untuk section, button text medium-bold.
- **Numeric emphasis**: angka (dates, place count, budget) sedikit lebih besar/bold untuk scannability.

**Rekomendasi Navisha:** Pastikan font stack konsisten. Pertimbangkan **tabular figures** (`font-variant-numeric: tabular-nums`) untuk angka budget/dates agar alignment rapi.

### Spacing & Layout
- **Generous whitespace** — tidak crowded. Card punya padding cukup, section punya margin jelas.
- **Card-based design** — hampir semua content dalam card rounded dengan subtle border/shadow. Consistent radius.
- **Grid fleksibel** — home page pakai grid yang adaptif, trip detail pakai split (sidebar + content + map).

### Iconography
- **Line icons** konsisten (kemungkinan custom atau dari set seperti Heroicons/Phosphor). Style unified.
- **Icon + label** selalu berpasangan — tidak ada icon tanpa konteks (kecuali action yang obvious seperti close).
- **Color-coded icons** per kategori item.

---

## 2. Layout Patterns

### Home/Dashboard Layout
```
┌─────────────────────────────────────────────┐
│ Navbar (logo + nav + search + profile)       │
├─────────────────────────────────────────────┤
│ [Banner: NEW FEATURE - dismissible]          │
├──────────────────────┬──────────────────────┤
│ Recently viewed &    │ World map visited     │
│ upcoming (carousel)  │ places + achievement   │
│ + Plan new trip      │ badge                  │
├──────────────────────┴──────────────────────┤
│ Need a place to stay? (hotel widget)         │
├──────────────────────┬──────────────────────┤
│ Your trips (list)    │ Your guides           │
├──────────────────────┴──────────────────────┤
│ Explore: Popular destinations (carousel)     │
└─────────────────────────────────────────────┘
```

**Pola kunci:**
- **Two-column asymmetric** — content utama kiri (lebar), secondary kanan (sempit).
- **Carousel horizontal** untuk trip list — lebih visual dari vertical list, hemat vertikal space.
- **Map sebagai identity element** — world map visited places bukan sekadar fitur, tapi visual anchor halaman.

**Rekomendasi Navisha:** Home saat ini mungkin list-based. Pertimbangkan:
- Trip list sebagai **horizontal carousel** dengan cover image besar — lebih engaging.
- Tambahkan **world map visited places** sebagai visual identity (bisa pakai react-simple-maps atau Google Maps dengan custom marker).

### Trip Detail Layout (Split View)
```
┌─────────────────────────────────────────────┐
│ Topbar: Saved status + Undo/Redo + Copy/Move│
├──────────┬────────────────────┬─────────────┤
│ Sidebar  │ Content (scroll)   │ Map (sticky) │
│ (tabs)   │ - Header image     │ - markers     │
│          │ - Explore carousel │ - layers      │
│ Overview │ - Reservations     │ - zoom        │
│ Explore  │ - Places to visit  │               │
│ Notes    │ - Itinerary (days) │               │
│ Flights  │ - Budget           │               │
│ Transit  │                    │               │
│ Places   │                    │               │
│ Itinerary│                    │               │
│ Budget   │                    │               │
└──────────┴────────────────────┴─────────────┘
```

**Pola kunci:**
- **3-column split** di desktop: sidebar nav + content + map. Map **selalu visible** (sticky), bukan tab.
- **Sidebar tab vertical** — semua section accessible tanpa scroll horizontal. Active state jelas.
- **Header image full-width** dengan trip title overlay — emotional anchor.

**Rekomendasi Navisha:** Ini paling penting. Saat ini Navisha kemungkinan pakai tab yang switch view (itinerary OR map). Ubah ke:
- **Split view permanent** di desktop: itinerary list kiri, map kanan (sticky).
- Klik activity → map pan/zoom ke marker.
- Di mobile, map bisa jadi collapsible bottom sheet.

---

## 3. UI Component Patterns

### Trip Card (Home)
- **Cover image** dominan (rasio ~16:9 atau 4:3).
- **Title bold** + dates + place count sebagai meta.
- **Avatar owner** kecil di pojok — social proof.
- **Share button** inline — quick action tanpa buka trip.
- **Hover state**: subtle lift/shadow.

### Day Card (Itinerary)
- **Date header** prominent ("Wednesday, July 22nd") + "More actions" menu.
- **Subheading field** editable inline.
- **Action row**: "Auto-fill day" + "Optimize route Pro" — AI actions dekat dengan konteks.
- **Item list** dengan drag handle, icon per tipe, time, title.
- **Empty state**: "Add a place" combobox + "Add note" + "Add checklist" — multiple entry points.

### Expense Modal
- **Single modal, all fields visible** — tidak multi-step.
- **Currency selector** sebagai button prefix (Rp) — inline, 1 klik.
- **Paid by** dengan avatar — visual, bukan dropdown text.
- **Split** sebagai segmented control (Individuals/Everyone/Don't split).
- **Date optional** — tidak wajib, reduksi friction.

**Rekomendasi Navisha:** Expense form saat ini mungkin terlalu panjang. Sederhanakan:
- Modal single-view, bukan full page form.
- Currency selector inline (button prefix).
- Split sebagai segmented control, bukan dropdown.

### AI Assistant Panel
- **Slide-in panel** dari kanan, tidak full-screen. Map tetap visible.
- **Chat bubble** dengan avatar user + Wanderlog logo.
- **Place names sebagai chip/button** dalam response — clickable, hover state.
- **Quota indicator** ("10 free messages left") di footer panel — transparan.
- **Example prompt chips** di empty state — reduksi cold start.

### Map Controls
- **Floating controls** (zoom, layers, focus search) di pojok — tidak block content.
- **Map layers panel** slide-out — toggle per category dengan checkbox + icon.
- **"Open in Google Maps"** link — escape hatch untuk user yang mau detail lebih.

---

## 4. UX Patterns & Interaction Design

### Progressive Disclosure
- **Trip creation minimal**: hanya "Where to?" + dates optional. Detail lain (budget, currency, cover) diisi nanti.
- **Form fields**: core fields dulu, "Additional details" collapsible.
- **Day card**: empty state sederhana, aksi muncul saat hover/focus.

**Rekomendasi Navisha:** Audit `TripForm.tsx` — apakah semua field wajib di awal? Pertimbangkan hanya destination + dates wajib, sisanya optional/progressive.

### Empty States
- **Selalu actionable** — bukan "No data". Contoh: "You don't have any guides yet. Create a new guide."
- **CTA inline** di empty state — langsung bisa action.
- **Illustration/icon** kecil untuk warmth.

### Loading States
- **Skeleton shimmer** untuk content blocks (terlihat di trip detail "Loading...").
- **"Thinking" indicator** untuk AI — dengan logo berputar.
- **Optimistic UI** untuk quick actions (add place, reorder).

### Feedback & Status
- **"Saved" indicator** di topbar — user tahu perubahan tersimpan (auto-save).
- **Undo/Redo** global — safety net untuk destructive actions.
- **Toast/notification** untuk success/error (implicit).

### Onboarding & Cold Start
- **Example prompt chips** di AI — user tidak perlu mikir apa yang harus ditanya.
- **Recommended places carousel** di trip — user tidak mulai dari blank.
- **Popular destinations** di home/guides — discovery tanpa search.

### Mobile Responsiveness (inferensi)
- Sidebar collapse jadi bottom tab atau hamburger.
- Map jadi collapsible bottom sheet.
- Carousel tetap horizontal (swipe).

---

## 5. Visual Hierarchy & Information Architecture

### Prioritas Visual (trip detail)
1. **Trip title + header image** (largest, top)
2. **Day headers** (medium, sectioned)
3. **Activity items** (card per item, consistent)
4. **Actions** (subtle, hover-reveal)
5. **Meta** (dates, count — small, gray)

### Scannability
- **Consistent card structure** — user belajar pattern sekali, apply ke semua.
- **Icon + color** per kategori — scanning cepat tanpa baca text.
- **Whitespace** sebagai separator — tidak perlu border berlebihan.

### Focus Management
- **Active tab** jelas (background highlight).
- **Selected place** di map → highlight di list (two-way binding).
- **Modal trap focus** — accessibility.

---

## 6. Rekomendasi Visual/UX Spesifik untuk Navisha

### P0 — Quick Wins Visual
- [ ] **V-01 — Definisikan primary color kuat** untuk semua CTA utama. Konsisten di seluruh app.
- [ ] **V-02 — Color-code per kategori** (transport/accommodation/food/activity/souvenir/shopping) di icon, badge, dan map marker. Sudah ada `categoryColors.ts`, pastikan konsisten.
- [ ] **V-03 — Tabular figures** untuk angka (budget, dates, counts) — alignment rapi.
- [ ] **V-04 — Card-based design konsisten** — radius, shadow, padding seragam. Audit coss ui primitives.
- [ ] **V-05 — Empty states actionable** — setiap empty state punya CTA inline, bukan "No data".

### P1 — Layout Restructure
- [ ] **V-06 — Split view itinerary + map (desktop)** `[overlap: W-PLAN-01, PLAN-01]`: map sticky permanent di kanan, bukan tab. Ini perubahan terbesar tapi highest impact.
- [ ] **V-07 — Trip list sebagai carousel** di home (cover image besar) — lebih engaging dari vertical list.
- [ ] **V-08 — World map visited places** di home/profile — visual identity + gamification.
- [ ] **V-09 — Sidebar tab vertical** di trip detail — semua section accessible tanpa scroll horizontal.
- [ ] **V-10 — Header image full-width** dengan trip title overlay — emotional anchor.

### P2 — Component Polish
- [ ] **V-11 — Expense modal single-view** dengan currency selector inline + split sebagai segmented control.
- [ ] **V-12 — AI panel slide-in** dari kanan, map tetap visible. Place chips interaktif di output.
- [ ] **V-13 — Day card dengan action row** (Auto-fill + Optimize) dekat konteks.
- [ ] **V-14 — Floating map controls** (zoom, layers, focus) — tidak block content.
- [ ] **V-15 — "Saved" indicator + Undo/Redo** di topbar — safety + trust.
- [ ] **V-16 — Skeleton shimmer** untuk loading, "Thinking" untuk AI.

### P3 — Delight & Polish
- [ ] **V-17 — Achievement badges** ("Roaming Voyager") — gamifikasi.
- [ ] **V-18 — Hover states** subtle (lift/shadow) di semua card.
- [ ] **V-19 — New feature banner** dismissible — announce fitur baru.
- [ ] **V-20 — Avatar owner** di trip card — social proof.

---

## 7. Apa yang TIDAK Perlu Diadopsi

- **Hotel aggregator** — terlalu berat untuk Navisha MVP, butuh integrasi banyak third-party.
- **Chrome extension** — channel acquisition terpisah, fokus dulu ke core web app.
- **Pro tier gating** — tunggu product-market fit dulu sebelum monetisasi.
- **Stadia Maps** — Google Maps sudah cukup untuk Navisha, migrasi provider map tidak worth effort sekarang.

---

## Ringkasan: 3 Pola Visual Paling Berdampak

1. **Split view itinerary + map (permanent)** — bukan tab. Ini mengubah cara user berinteraksi dengan trip plan. Map selalu kontekstual.
2. **Color-coded categories** di icon + badge + map marker — scanning cepat, visual identity kuat.
3. **AI output sebagai actionable chips** — bukan plain text. Setiap tempat adalah tombol. Mengubah AI dari info → action.

Tiga pola ini, jika diadopsi, akan memberi Navisha feel yang jauh lebih premium dan usable.
