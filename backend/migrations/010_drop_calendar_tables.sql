-- 010_drop_calendar_tables.sql
-- Remove Calendar Export feature (F4) artifacts.
-- Calendar export was removed on 2026-06-25.

DROP TABLE IF EXISTS calendar_exports;

ALTER TABLE users
  DROP COLUMN IF EXISTS google_refresh_token,
  DROP COLUMN IF EXISTS google_access_token,
  DROP COLUMN IF EXISTS google_token_expiry,
  DROP COLUMN IF EXISTS google_scopes;
