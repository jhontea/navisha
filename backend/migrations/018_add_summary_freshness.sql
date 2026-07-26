ALTER TABLE trip_summaries
    ADD COLUMN IF NOT EXISTS source_updated_at TIMESTAMPTZ;

UPDATE trip_summaries
SET source_updated_at = updated_at
WHERE source_updated_at IS NULL;

ALTER TABLE trip_summaries
    ALTER COLUMN source_updated_at SET NOT NULL;

CREATE OR REPLACE FUNCTION touch_trip_from_direct_child()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        UPDATE trips SET updated_at = NOW() WHERE id = OLD.trip_id;
        RETURN OLD;
    ELSIF TG_OP = 'INSERT' THEN
        UPDATE trips SET updated_at = NOW() WHERE id = NEW.trip_id;
        RETURN NEW;
    END IF;

    UPDATE trips
    SET updated_at = NOW()
    WHERE id IN (OLD.trip_id, NEW.trip_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION touch_trip_from_activity()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        UPDATE trips
        SET updated_at = NOW()
        WHERE id = (SELECT trip_id FROM days WHERE id = OLD.day_id);
        RETURN OLD;
    ELSIF TG_OP = 'INSERT' THEN
        UPDATE trips
        SET updated_at = NOW()
        WHERE id = (SELECT trip_id FROM days WHERE id = NEW.day_id);
        RETURN NEW;
    END IF;

    UPDATE trips
    SET updated_at = NOW()
    WHERE id IN (
        SELECT trip_id FROM days WHERE id IN (OLD.day_id, NEW.day_id)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_days_touch_trip ON days;
CREATE TRIGGER trg_days_touch_trip
AFTER INSERT OR UPDATE OR DELETE ON days
FOR EACH ROW EXECUTE FUNCTION touch_trip_from_direct_child();

DROP TRIGGER IF EXISTS trg_activities_touch_trip ON activities;
CREATE TRIGGER trg_activities_touch_trip
AFTER INSERT OR UPDATE OR DELETE ON activities
FOR EACH ROW EXECUTE FUNCTION touch_trip_from_activity();

DROP TRIGGER IF EXISTS trg_accommodations_touch_trip ON accommodations;
CREATE TRIGGER trg_accommodations_touch_trip
AFTER INSERT OR UPDATE OR DELETE ON accommodations
FOR EACH ROW EXECUTE FUNCTION touch_trip_from_direct_child();

DROP TRIGGER IF EXISTS trg_transportations_touch_trip ON transportations;
CREATE TRIGGER trg_transportations_touch_trip
AFTER INSERT OR UPDATE OR DELETE ON transportations
FOR EACH ROW EXECUTE FUNCTION touch_trip_from_direct_child();

DROP TRIGGER IF EXISTS trg_expenses_touch_trip ON expenses;
CREATE TRIGGER trg_expenses_touch_trip
AFTER INSERT OR UPDATE OR DELETE ON expenses
FOR EACH ROW EXECUTE FUNCTION touch_trip_from_direct_child();
