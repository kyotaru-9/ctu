-- Create excuse-proofs storage bucket

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
    ('excuse-proofs', 'excuse-proofs', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Excuse proofs bucket policies
DROP POLICY IF EXISTS "Admins can manage excuse proofs" ON storage.objects;
CREATE POLICY "Admins can manage excuse proofs" ON storage.objects
    FOR ALL USING (
        bucket_id = 'excuse-proofs' AND
        EXISTS (SELECT 1 FROM profiles WHERE auth_user_id = auth.uid() AND role = 'admin')
    );

DROP POLICY IF EXISTS "Students can upload own excuse proofs" ON storage.objects;
CREATE POLICY "Students can upload own excuse proofs" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'excuse-proofs' AND
        (storage.foldername(name))[1] = (
            SELECT section_id::text FROM profiles WHERE auth_user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Students can view own excuse proofs" ON storage.objects;
CREATE POLICY "Students can view own excuse proofs" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'excuse-proofs' AND
        (storage.foldername(name))[1] = (
            SELECT section_id::text FROM profiles WHERE auth_user_id = auth.uid()
        )
    );
