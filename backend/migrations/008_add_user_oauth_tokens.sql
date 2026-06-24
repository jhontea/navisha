-- Store Google OAuth tokens so the backend can call Google APIs (Calendar) on
-- the user's behalf. Required for F4 (Export to Google Calendar).
-- Refresh token is stored plaintext for MVP; encryption can be added later.
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS google_refresh_token TEXT,
    ADD COLUMN IF NOT EXISTS google_access_token  TEXT,
    ADD COLUMN IF NOT EXISTS google_token_expiry  TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS google_scopes        TEXT[];
