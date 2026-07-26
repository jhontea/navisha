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
