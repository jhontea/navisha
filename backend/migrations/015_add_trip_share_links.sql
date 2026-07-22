CREATE TABLE IF NOT EXISTS trip_share_links (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id          UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    created_by       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at       TIMESTAMPTZ NOT NULL,
    revoked_at       TIMESTAMPTZ,
    last_accessed_at TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trip_share_links_trip_id ON trip_share_links(trip_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_trip_share_links_one_active
    ON trip_share_links(trip_id) WHERE revoked_at IS NULL;
