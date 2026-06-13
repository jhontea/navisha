# API Reference

Base URL: `http://localhost:8080/api/v1`

All authenticated endpoints require JWT in httpOnly cookie (set automatically on login).

---

## Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/auth/google` | No | Redirect to Google consent |
| GET | `/auth/google/callback` | No | OAuth callback, issues JWT |
| POST | `/auth/logout` | Yes | Clear auth cookies |
| GET | `/auth/me` | Yes | Get current user |

**GET /auth/me response:**
```json
{
  "id": "uuid",
  "email": "user@gmail.com",
  "name": "Ahmad Hafizh",
  "avatar_url": "https://..."
}
```

---

## Currency

Supported currencies (MVP): `IDR`, `USD`, `JPY`, `SGD`, `KRW`

Source: **CurrencyFreaks** API (USD-based free tier). Cross rates `base→target` computed as `usd_rates[target] / usd_rates[base]`. Full USD-keyed rates cached in Redis under `rates:USD`, TTL from `config.yaml` (default 1h).

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/currency/supported` | Yes | List supported currency codes + symbols |
| GET | `/currency/rates?base=IDR` | Yes | All cross-rates for a base currency |
| GET | `/currency/convert?from=USD&to=IDR&amount=100` | Yes | Convert amount between currencies |

**GET /currency/supported response:**
```json
{
  "supported": [
    { "code": "IDR", "symbol": "Rp" },
    { "code": "USD", "symbol": "$" },
    { "code": "JPY", "symbol": "¥" },
    { "code": "SGD", "symbol": "S$" },
    { "code": "KRW", "symbol": "₩" }
  ]
}
```

**GET /currency/convert?from=USD&to=IDR&amount=100 response:**
```json
{
  "from": "USD",
  "to": "IDR",
  "amount": 100,
  "converted_amount": 1781050,
  "rate": 17810.5
}
```

**GET /currency/rates?base=IDR response:**
```json
{
  "base": "IDR",
  "rates": [
    { "currency": "IDR", "rate": 1.0,       "symbol": "Rp", "fetched_at": "..." },
    { "currency": "USD", "rate": 0.0000562, "symbol": "$",  "fetched_at": "..." },
    { "currency": "JPY", "rate": 0.00899,   "symbol": "¥",  "fetched_at": "..." },
    { "currency": "SGD", "rate": 0.0000721, "symbol": "S$", "fetched_at": "..." },
    { "currency": "KRW", "rate": 0.0853,    "symbol": "₩",  "fetched_at": "..." }
  ]
}
```

**Errors:** 400 unsupported currency · 400 invalid amount (Convert)

---

## Trips

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/trips?limit=20&cursor=…` | Yes | List user's trips (cursor pagination) |
| POST | `/trips` | Yes | Create trip + auto-generated days |
| GET | `/trips/:id` | Yes | Get trip detail with days |
| PUT | `/trips/:id` | Yes | Update trip metadata |
| DELETE | `/trips/:id` | Yes | Delete trip (CASCADE days/activities) |

**GET /trips response:**
```json
{
  "items": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "title": "Bali Trip",
      "start_date": "2026-07-01",
      "end_date": "2026-07-07",
      "base_currency": "IDR",
      "cover_image_url": "https://...",
      "notes": "...",
      "created_at": "...",
      "updated_at": "..."
    }
  ],
  "next_cursor": "MjAyNi0wNi0xMFQwMDowMDowMFp8YWJj"
}
```
Pagination: order = `start_date DESC, id DESC`. Pass `next_cursor` from prior response as `?cursor=` for next page. Empty `next_cursor` = no more pages. `limit` default 20, max 50.

**POST /trips body:**
```json
{
  "title": "Bali Trip",
  "description": "Honeymoon",
  "start_date": "2026-07-01",
  "end_date": "2026-07-07",
  "base_currency": "IDR",
  "cover_image_url": "https://...",
  "notes": "Optional general trip notes"
}
```

**GET /trips/:id response:**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "title": "Bali Trip",
  "description": "Honeymoon",
  "start_date": "2026-07-01",
  "end_date": "2026-07-07",
  "base_currency": "IDR",
  "cover_image_url": "https://...",
  "notes": "...",
  "created_at": "...",
  "updated_at": "...",
  "days": [
    {
      "id": "uuid",
      "trip_id": "uuid",
      "date": "2026-07-01",
      "day_number": 1,
      "notes": ""
    }
  ]
}
```
Activities/transportations/accommodations not yet returned — separate endpoints added in later sessions.

**Errors:** 400 invalid dates/currency/cursor · 403 not owner · 404 not found

---

## Transportations (trip-level)

`type` values: `flight` | `bus` | `train` | `ferry` | `ship` | `car` | `other`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/trips/:trip_id/transportations` | Yes | Add transportation |
| PUT | `/transportations/:id` | Yes | Update |
| DELETE | `/transportations/:id` | Yes | Delete |

**POST body:**
```json
{
  "type": "flight",
  "label": "Jakarta → Bali",
  "departure_datetime": "2026-07-01T06:00:00Z",
  "arrival_datetime": "2026-07-01T07:20:00Z",
  "from": "CGK",
  "to": "DPS",
  "operator": "Garuda Indonesia",
  "reference_number": "GA-400",
  "notes": "Check-in 2h before"
}
```

---

## Accommodations (trip-level)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/trips/:trip_id/accommodations` | Yes | Add accommodation |
| PUT | `/accommodations/:id` | Yes | Update |
| DELETE | `/accommodations/:id` | Yes | Delete |

**POST body:**
```json
{
  "name": "Four Seasons Bali",
  "location_name": "Jimbaran, Bali",
  "lat": -8.7832,
  "lng": 115.1637,
  "google_place_id": "ChIJ...",
  "check_in": "2026-07-01",
  "check_out": "2026-07-07",
  "confirmation_number": "FS-12345",
  "notes": "Early check-in requested"
}
```

---

## Activities (day-level, polymorphic)

Activity has 3 types: `location`, `note`, `todo`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/days/:day_id/activities` | Yes | List activities for a day |
| POST | `/days/:day_id/activities` | Yes | Add activity (appended at end) |
| PUT | `/activities/:id` | Yes | Update activity (cannot change type) |
| DELETE | `/activities/:id` | Yes | Delete activity |
| PUT | `/days/:day_id/activities/reorder` | Yes | Reorder activities for the day |

Ownership chain (`activity → day → trip → user`) verified server-side via JOIN. 403 if caller does not own the parent trip.

**POST body — type: location**
```json
{
  "type": "location",
  "title": "Kuta Beach",
  "start_time": "08:00",
  "end_time": "10:00",
  "payload": {
    "location_name": "Kuta Beach, Bali",
    "lat": -8.7184,
    "lng": 115.1686,
    "google_place_id": "ChIJ...",
    "address": "Kuta, Badung Regency, Bali",
    "notes": "Morning swim, watch sunrise",
    "image_urls": ["https://..."]
  }
}
```

**POST body — type: note**
```json
{
  "type": "note",
  "title": "Reminders",
  "payload": {
    "content": "Bring sunscreen, cash for local market, ..."
  }
}
```

**POST body — type: todo**
```json
{
  "type": "todo",
  "title": "Packing checklist",
  "payload": {
    "items": [
      { "id": "uuid", "text": "Sunscreen", "completed": false },
      { "id": "uuid", "text": "Adapter plug", "completed": false }
    ]
  }
}
```

**PUT reorder body:**
```json
{
  "ids": ["uuid-1", "uuid-2", "uuid-3"]
}
```
Must contain the **full set** of activity IDs for the day in their new order. Server rejects with 400 `reorder list does not match day activities` if set differs. Reorder is atomic (single transaction).

**GET /days/:day_id/activities response:**
```json
{
  "items": [
    {
      "id": "uuid",
      "day_id": "uuid",
      "type": "location",
      "title": "Kuta Beach",
      "start_time": "08:00",
      "end_time": "10:00",
      "order_index": 0,
      "payload": { "...": "..." },
      "created_at": "...",
      "updated_at": "..."
    }
  ]
}
```

**Activity response (unified — POST, PUT, list item):**
```json
{
  "id": "uuid",
  "day_id": "uuid",
  "type": "location",
  "title": "Kuta Beach",
  "start_time": "08:00",
  "end_time": "10:00",
  "order_index": 0,
  "payload": { "...": "..." },
  "created_at": "...",
  "updated_at": "..."
}
```

---

## Budget / Expenses

Categories: `accommodation | transport | food | activity | other`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/trips/:trip_id/expenses` | Yes | List expenses for a trip |
| POST | `/trips/:trip_id/expenses` | Yes | Add expense (auto-converts to trip base currency) |
| GET | `/trips/:trip_id/expenses/summary` | Yes | Total + by-category breakdown |
| PUT | `/expenses/:id` | Yes | Update expense (reconverts) |
| DELETE | `/expenses/:id` | Yes | Delete expense |

Ownership chain `expense → trip → user` verified via JOIN. Currency conversion runs at insert/update via `currency.Usecase`; `converted_amount` + `base_currency` are stored on the row.

**POST body:**
```json
{
  "title": "Hotel deposit",
  "amount": 500,
  "currency": "USD",
  "category": "accommodation",
  "activity_id": "uuid (optional, may be null)"
}
```

**Expense response (POST, PUT, list item):**
```json
{
  "id": "uuid",
  "trip_id": "uuid",
  "activity_id": null,
  "title": "Hotel deposit",
  "amount": 500,
  "currency": "USD",
  "converted_amount": 8905250,
  "base_currency": "IDR",
  "category": "accommodation",
  "created_at": "...",
  "updated_at": "..."
}
```

**GET /trips/:trip_id/expenses response:**
```json
{
  "items": [ /* expense objects */ ]
}
```

**GET /trips/:trip_id/expenses/summary response:**
```json
{
  "total_base": 5000000,
  "base_currency": "IDR",
  "by_category": [
    { "category": "accommodation", "total": 2000000 },
    { "category": "transport",     "total": 500000 },
    { "category": "food",          "total": 1500000 },
    { "category": "activity",      "total": 1000000 }
  ]
}
```

---

## Error Format

```json
{
  "error": "trip not found",
  "code": "TRIP_NOT_FOUND"
}
```

HTTP status codes: 400, 401, 403, 404, 500.
