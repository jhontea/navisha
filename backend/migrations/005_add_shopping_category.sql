-- Rename souvenir category label (frontend only change) and add 'shopping'.
-- Drop old constraint and add new one with shopping included.
ALTER TABLE expenses
  DROP CONSTRAINT IF EXISTS expenses_category_check;

ALTER TABLE expenses
  ADD CONSTRAINT expenses_category_check
  CHECK (category IN ('accommodation', 'transport', 'food', 'activity', 'souvenir', 'shopping', 'other'));
