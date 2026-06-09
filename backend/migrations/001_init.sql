-- Users (Google OAuth only — no password)
CREATE TABLE IF NOT EXISTS users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    google_id   TEXT NOT NULL UNIQUE,
    email       TEXT NOT NULL UNIQUE,
    name        TEXT NOT NULL,
    avatar_url  TEXT NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trips
CREATE TABLE IF NOT EXISTS trips (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title           TEXT NOT NULL,
    description     TEXT NOT NULL DEFAULT '',
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    base_currency   TEXT NOT NULL DEFAULT 'IDR',
    cover_image_url TEXT NOT NULL DEFAULT '',
    notes           TEXT NOT NULL DEFAULT '',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trips_user_id ON trips(user_id);

-- Days (auto-generated from trip date range on trip creation)
-- day_number stored for display convenience ("Day 1", "Day 2", …)
CREATE TABLE IF NOT EXISTS days (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id     UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    date        DATE NOT NULL,
    day_number  INT NOT NULL,
    notes       TEXT NOT NULL DEFAULT '',
    UNIQUE (trip_id, date)
);

CREATE INDEX IF NOT EXISTS idx_days_trip_id ON days(trip_id);

-- Activities (day-level, polymorphic: location | note | todo)
CREATE TABLE IF NOT EXISTS activities (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    day_id      UUID NOT NULL REFERENCES days(id) ON DELETE CASCADE,
    type        TEXT NOT NULL CHECK (type IN ('location', 'note', 'todo')),
    title       TEXT NOT NULL,
    start_time  TEXT NOT NULL DEFAULT '',
    end_time    TEXT NOT NULL DEFAULT '',
    order_index INT NOT NULL DEFAULT 0,
    payload     JSONB NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activities_day_id ON activities(day_id);

-- Transportations (trip-level)
CREATE TABLE IF NOT EXISTS transportations (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id            UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    type               TEXT NOT NULL CHECK (type IN ('flight', 'bus', 'train', 'ferry', 'ship', 'car', 'other')),
    label              TEXT NOT NULL DEFAULT '',
    operator           TEXT NOT NULL DEFAULT '',
    reference_number   TEXT NOT NULL DEFAULT '',
    from_location      TEXT NOT NULL DEFAULT '',
    to_location        TEXT NOT NULL DEFAULT '',
    departure_datetime TIMESTAMPTZ,
    arrival_datetime   TIMESTAMPTZ,
    notes              TEXT NOT NULL DEFAULT '',
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transportations_trip_id ON transportations(trip_id);

-- Accommodations (trip-level)
CREATE TABLE IF NOT EXISTS accommodations (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id             UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    name                TEXT NOT NULL,
    location_name       TEXT NOT NULL DEFAULT '',
    lat                 DOUBLE PRECISION,
    lng                 DOUBLE PRECISION,
    google_place_id     TEXT NOT NULL DEFAULT '',
    check_in            DATE NOT NULL,
    check_out           DATE NOT NULL,
    confirmation_number TEXT NOT NULL DEFAULT '',
    notes               TEXT NOT NULL DEFAULT '',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_accommodations_trip_id ON accommodations(trip_id);

-- Expenses (trip-level, optionally linked to an activity)
-- amount/currency = original payment; converted_amount/base_currency = in trip's base currency
-- Example: amount=500, currency="USD", converted_amount=8100000, base_currency="IDR"
CREATE TABLE IF NOT EXISTS expenses (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id          UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    activity_id      UUID REFERENCES activities(id) ON DELETE SET NULL,
    title            TEXT NOT NULL,
    amount           NUMERIC(14, 4) NOT NULL,
    currency         TEXT NOT NULL,
    converted_amount NUMERIC(14, 4) NOT NULL DEFAULT 0,
    base_currency    TEXT NOT NULL,
    category         TEXT NOT NULL CHECK (category IN ('accommodation', 'transport', 'food', 'activity', 'other')),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_trip_id ON expenses(trip_id);
