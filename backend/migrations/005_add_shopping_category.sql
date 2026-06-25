-- Add 'shopping' to the category check constraint on expenses.
-- Fix any rows with invalid categories before changing the constraint.
UPDATE expenses SET category = 'other'
  WHERE category NOT IN ('accommodation', 'transport', 'food', 'activity', 'souvenir', 'shopping', 'other');

-- Drop old constraint and add new one with shopping included.
ALTER TABLE expenses
  DROP CONSTRAINT IF EXISTS expenses_category_check;

ALTER TABLE expenses
  ADD CONSTRAINT expenses_category_check
  CHECK (category IN ('accommodation', 'transport', 'food', 'activity', 'souvenir', 'shopping', 'other'));
