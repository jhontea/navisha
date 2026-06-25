-- 011_add_performance_indexes.sql
-- Phase 3D: Backend Performance Optimization
-- Adds composite indexes for cursor pagination, upcoming trips, sorted activities,
-- and expense category grouping.

-- Covers cursor pagination: WHERE user_id = $1 AND (start_date, id) < ($2, $3) ORDER BY start_date DESC, id DESC
CREATE INDEX IF NOT EXISTS idx_trips_user_dates ON trips(user_id, start_date DESC, id DESC);

-- Covers ListUpcoming: WHERE user_id = $1 AND end_date >= CURRENT_DATE ORDER BY start_date ASC
CREATE INDEX IF NOT EXISTS idx_trips_user_end_date ON trips(user_id, end_date);

-- Covers sorted activity listing: WHERE day_id = $1 ORDER BY order_index ASC, created_at ASC
CREATE INDEX IF NOT EXISTS idx_activities_day_order ON activities(day_id, order_index);

-- Covers expense summary GROUP BY: SELECT category, SUM(converted_amount) FROM expenses WHERE trip_id = $1 GROUP BY category
CREATE INDEX IF NOT EXISTS idx_expenses_trip_category ON expenses(trip_id, category);
