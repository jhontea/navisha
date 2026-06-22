-- Add expense_date (date of the expense, user-editable) and note fields.
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS expense_date DATE NOT NULL DEFAULT CURRENT_DATE;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS note TEXT NOT NULL DEFAULT '';

-- Backfill existing rows: use created_at date
UPDATE expenses SET expense_date = created_at::date WHERE expense_date = CURRENT_DATE AND created_at::date <> CURRENT_DATE;
