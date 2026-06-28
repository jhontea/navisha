-- Migration 012: Fix broken Google Places photo URLs
--
-- Problem: Old trips have session-scoped Google Places JS API URLs stored in
-- cover_image_url. These URLs expire when the browser session ends, causing
-- broken images.
--
-- Solution: Convert broken URLs to use our stable proxy endpoint
-- (/api/place-photo?ref=<photoreference>).
--
-- The broken URL pattern:
--   https://maps.googleapis.com/maps/api/place/js/PhotoService.GetPhoto?1s<photoreference>&...
--
-- We extract the photoreference (the value after "1s" and before "&" or end of string)
-- and convert it to: /api/place-photo?ref=<photoreference>

-- First, let's see what we're working with (for debugging)
-- SELECT id, title, cover_image_url
-- FROM trips
-- WHERE cover_image_url LIKE '%PhotoService.GetPhoto%';

-- Update all trips with broken Google Places photo URLs
-- The regex extracts the photoreference from the 1s parameter
UPDATE trips
SET cover_image_url = '/api/place-photo?ref=' || regexp_replace(
  (regexp_match(cover_image_url, '\?[^&]*1s([^&]+)'))[1],
  '/', '%2F', 'g'
)
WHERE cover_image_url LIKE '%PhotoService.GetPhoto%'
  AND cover_image_url ~ '\?[^&]*1s[^&]+';

-- Verify the fix
-- SELECT id, title, cover_image_url
-- FROM trips
-- WHERE cover_image_url LIKE '/api/place-photo%';