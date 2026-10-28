-- Create storage bucket for cleaning records
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'cleaning-records',
  'cleaning-records',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Create storage policy for public read access
CREATE POLICY "Public read access to cleaning-records"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'cleaning-records');

-- Create storage policy for authenticated insert
CREATE POLICY "Authenticated users can upload to cleaning-records"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'cleaning-records');

-- Migration complete
