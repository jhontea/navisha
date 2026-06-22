-- Add 'souvenir' to the category check constraint on expenses.
-- Drop old constraint first, then add new one with souvenir included.
ALTER TABLE expenses
  DROP CONSTRAINT IF EXISTS expenses_category_check;

ALTER TABLE expenses
  ADD CONSTRAINT expenses_category_check
  CHECK (category IN ('accommodation', 'transport', 'food', 'activity', 'souvenir', 'other'));
