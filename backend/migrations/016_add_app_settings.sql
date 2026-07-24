-- 016: app_settings key-value table for runtime configuration.
-- Allows editing settings (e.g. AI quota) without server restart.
CREATE TABLE IF NOT EXISTS app_settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- Default: 10 AI generations per user per day.
INSERT INTO app_settings (key, value)
VALUES ('autogen_daily_quota', '10')
ON CONFLICT (key) DO NOTHING;
