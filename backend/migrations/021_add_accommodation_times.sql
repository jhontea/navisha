-- Optional check-in / check-out times ("HH:MM") so stays sit at the right
-- spot on a day's timeline. NULL means "not set"; the UI then assumes the
-- usual hotel times (check-in 14:00, check-out 12:00).
ALTER TABLE accommodations
    ADD COLUMN IF NOT EXISTS check_in_time  TEXT,
    ADD COLUMN IF NOT EXISTS check_out_time TEXT;
