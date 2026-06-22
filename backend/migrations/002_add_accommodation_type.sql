-- Add type column to accommodations table.
-- Default 'hotel' so existing rows stay valid without data migration.
ALTER TABLE accommodations
    ADD COLUMN IF NOT EXISTS accommodation_type TEXT NOT NULL DEFAULT 'hotel';
