-- Persist single-use refresh sessions so rotation and logout can revoke tokens.
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE;

-- Existing accounts were created through Google's userinfo endpoint.
UPDATE users SET email_verified = TRUE WHERE email_verified = FALSE;

CREATE TABLE IF NOT EXISTS refresh_sessions (
    id          TEXT PRIMARY KEY,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  BYTEA NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL,
    revoked_at  TIMESTAMPTZ,
    replaced_by TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_sessions_user_active
    ON refresh_sessions (user_id, expires_at)
    WHERE revoked_at IS NULL;
