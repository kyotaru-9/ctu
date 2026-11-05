-- Make room-submissions bucket public
-- This allows public URLs to work for viewing images

UPDATE storage.buckets
SET public = true
WHERE id = 'room-submissions';
