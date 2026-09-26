-- Storage Buckets and Policies
-- Run this after RLS policies

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('room-submissions', 'room-submissions', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']),
    ('report-proofs', 'report-proofs', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']),
    ('profile-images', 'profile-images', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Room submissions bucket policies
CREATE POLICY "Admins can manage room submissions" ON storage.objects
    FOR ALL USING (
        bucket_id = 'room-submissions' AND 
        EXISTS (SELECT 1 FROM profiles WHERE auth_user_id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Students can upload own submissions" ON  storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'room-submissions' AND
        (storage.foldername(name))[1] = (
            SELECT section_id::text FROM profiles WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Students can view own submissions" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'room-submissions' AND
        (storage.foldername(name))[1] = (
            SELECT section_id::text FROM profiles WHERE auth_user_id = auth.uid()
        )
    );

-- Report proofs bucket policies
CREATE POLICY "Admins can manage report proofs" ON storage.objects
    FOR ALL USING (
        bucket_id = 'report-proofs' AND 
        EXISTS (SELECT 1 FROM profiles WHERE auth_user_id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Students can upload own report proofs" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'report-proofs' AND
        (storage.foldername(name))[1] = (
            SELECT section_id::text FROM profiles WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Students can view own report proofs" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'report-proofs' AND
        (storage.foldername(name))[1] = (
            SELECT section_id::text FROM profiles WHERE auth_user_id = auth.uid()
        )
    );

-- Profile images bucket policies
CREATE POLICY "Admins can manage profile images" ON storage.objects
    FOR ALL USING (
        bucket_id = 'profile-images' AND 
        EXISTS (SELECT 1 FROM profiles WHERE auth_user_id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Users can upload own profile image" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'profile-images' AND
        name LIKE (SELECT id::text || '%' FROM profiles WHERE auth_user_id = auth.uid())
    );

CREATE POLICY "Users can view own profile image" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'profile-images' AND
        name LIKE (SELECT id::text || '%' FROM profiles WHERE auth_user_id = auth.uid())
    );

-- Public read for profile images (optional - if you want avatars to be public)
-- CREATE POLICY "Public can view profile images" ON storage.objects
--     FOR SELECT USING (bucket_id = 'profile-images');