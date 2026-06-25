-- Add 'souvenir' to the category check constraint on expenses.
-- First, fix any rows with invalid categories (safety net for existing data).
UPDATE expenses SET category = 'other'
  WHERE category NOT IN ('accommodation', 'transport', 'food', 'activity', 'souvenir', 'other');

-- Drop old constraint and add new one with souvenir included.
ALTER TABLE expenses
  DROP CONSTRAINT IF EXISTS expenses_category_check;

ALTER TABLE expenses
  ADD CONSTRAINT expenses_category_check
  CHECK (category IN ('accommodation', 'transport', 'food', 'activity', 'souvenir', 'other'));
