-- Tracks which Navisha entities have been exported as Google Calendar events,
-- so exports are idempotent and events can be removed when the entity (or its
-- trip) is deleted. Required for F4 (Export to Google Calendar).
CREATE TABLE IF NOT EXISTS calendar_exports (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    trip_id            UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    source_type        TEXT NOT NULL,            -- e.g. 'activity'
    source_id          UUID NOT NULL,            -- the activity id
    google_event_id    TEXT NOT NULL,
    google_calendar_id TEXT NOT NULL DEFAULT 'primary',
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (source_type, source_id)
);

CREATE INDEX IF NOT EXISTS idx_calendar_exports_trip_id ON calendar_exports(trip_id);
CREATE INDEX IF NOT EXISTS idx_calendar_exports_user_id ON calendar_exports(user_id);
