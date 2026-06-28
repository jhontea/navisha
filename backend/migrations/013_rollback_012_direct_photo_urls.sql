-- Migration 013: Rollback 012 — convert proxy URLs to direct Google Photo URLs
--
-- Migration 012 converted broken JS API URLs to /api/place-photo?ref=...
-- The proxy endpoint returned 403 (API key HTTP-referrer restriction blocks
-- server-side calls). We now use direct Google Places Photo REST API URLs
-- loaded from the browser, which sends the correct Referer header.
--
-- This migration extracts the photoreference from the proxy URL and builds
-- a stable direct URL that works from <img src="..."> in the browser.
--
-- The API key is NEXT_PUBLIC_ (already public in the JS bundle), so embedding
-- it here is safe.

-- Update all trips that still use the broken proxy endpoint
UPDATE trips
SET cover_image_url = 'https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference='
                      || (regexp_match(cover_image_url, '[?&]ref=([^&]+)'))[1]
                      || '&key=AIzaSyBg0MWOWkzkuHTQpj-ZIfQltcDfHnliitk'
WHERE cover_image_url LIKE '/api/place-photo?ref=%';

-- Also fix any remaining broken JS API URLs (from before migration 012,
-- in case 012 missed some or new ones were added)
UPDATE trips
SET cover_image_url = 'https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference='
                      || regexp_replace(
                           (regexp_match(cover_image_url, '\?[^&]*1s([^&]+)'))[1],
                           '/', '%2F', 'g'
                         )
                      || '&key=AIzaSyBg0MWOWkzkuHTQpj-ZIfQltcDfHnliitk'
WHERE cover_image_url LIKE '%PhotoService.GetPhoto%'
  AND cover_image_url ~ '\?[^&]*1s[^&]+';

-- Verify
-- SELECT id, title, cover_image_url
-- FROM trips
-- WHERE cover_image_url LIKE '%maps.googleapis.com/maps/api/place/photo%';
