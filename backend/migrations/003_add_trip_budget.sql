-- Add budget column to trips table.
-- budget = 0 means no budget set (unlimited / untracked).
ALTER TABLE trips ADD COLUMN IF NOT EXISTS budget NUMERIC(14, 4) NOT NULL DEFAULT 0;
