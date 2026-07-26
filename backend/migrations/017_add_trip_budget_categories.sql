-- Store optional planned allocations by expense category.
ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS budget_categories JSONB NOT NULL DEFAULT '{}'::jsonb;

