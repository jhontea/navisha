-- Optional user-defined label for an itinerary day (for example, "Shibuya & Harajuku").
ALTER TABLE days
    ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT '';
