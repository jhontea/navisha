-- Link the expense a booking's "Cost" field creates back to that booking, so
-- editing the transport or stay can change (or remove) its cost. Deleting a
-- booking keeps the expense in the budget, as before.
ALTER TABLE expenses
    ADD COLUMN IF NOT EXISTS transportation_id UUID REFERENCES transportations(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS accommodation_id  UUID REFERENCES accommodations(id) ON DELETE SET NULL;

-- One cost per booking.
CREATE UNIQUE INDEX IF NOT EXISTS idx_expenses_transportation_id
    ON expenses (transportation_id) WHERE transportation_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_expenses_accommodation_id
    ON expenses (accommodation_id) WHERE accommodation_id IS NOT NULL;

-- Backfill: an existing expense is the booking's cost when it looks exactly
-- like the one the Cost field created (same trip, category and title, dated
-- on the travel / check-in day, give or take a day for time zones), and the
-- match is one-to-one. Anything ambiguous stays unlinked.
WITH pairs AS (
    SELECT e.id AS expense_id, t.id AS booking_id
      FROM transportations t
      JOIN expenses e
        ON e.trip_id = t.trip_id
       AND e.category = 'transport'
       AND e.transportation_id IS NULL
       AND e.title = COALESCE(NULLIF(t.label, ''), t.type)
       AND (t.departure_datetime IS NULL
            OR abs(e.expense_date - (t.departure_datetime AT TIME ZONE 'UTC')::date) <= 1)
), one_to_one AS (
    SELECT expense_id, booking_id FROM pairs
     WHERE expense_id IN (SELECT expense_id FROM pairs GROUP BY expense_id HAVING COUNT(*) = 1)
       AND booking_id IN (SELECT booking_id FROM pairs GROUP BY booking_id HAVING COUNT(*) = 1)
)
UPDATE expenses e
   SET transportation_id = p.booking_id
  FROM one_to_one p
 WHERE e.id = p.expense_id;

WITH pairs AS (
    SELECT e.id AS expense_id, a.id AS booking_id
      FROM accommodations a
      JOIN expenses e
        ON e.trip_id = a.trip_id
       AND e.category = 'accommodation'
       AND e.accommodation_id IS NULL
       AND e.transportation_id IS NULL
       AND e.title = a.name
       AND abs(e.expense_date - a.check_in) <= 1
), one_to_one AS (
    SELECT expense_id, booking_id FROM pairs
     WHERE expense_id IN (SELECT expense_id FROM pairs GROUP BY expense_id HAVING COUNT(*) = 1)
       AND booking_id IN (SELECT booking_id FROM pairs GROUP BY booking_id HAVING COUNT(*) = 1)
)
UPDATE expenses e
   SET accommodation_id = p.booking_id
  FROM one_to_one p
 WHERE e.id = p.expense_id;
