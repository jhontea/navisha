-- AI-generated trip summaries (one per trip, regenerated on demand)
CREATE TABLE IF NOT EXISTS trip_summaries (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id     UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    content     TEXT NOT NULL,
    model       TEXT NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (trip_id)
);

CREATE INDEX IF NOT EXISTS idx_trip_summaries_trip_id ON trip_summaries(trip_id);
