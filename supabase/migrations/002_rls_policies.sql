-- Row Level Security Policies
-- Run this after the initial schema migration

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE occupations ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_reasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
DECLARE
    user_role user_role;
BEGIN
    SELECT role INTO user_role FROM profiles WHERE auth_user_id = auth.uid();
    RETURN user_role = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get current user's section
CREATE OR REPLACE FUNCTION current_user_section()
RETURNS UUID AS $$
DECLARE
    section_id UUID;
BEGIN
    SELECT section_id INTO section_id FROM profiles WHERE auth_user_id = auth.uid();
    RETURN section_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is student or student_special
CREATE OR REPLACE FUNCTION is_student()
RETURNS BOOLEAN AS $$
DECLARE
    user_role user_role;
BEGIN
    SELECT role INTO user_role FROM profiles WHERE auth_user_id = auth.uid();
    RETURN user_role IN ('student', 'student_special');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles policies
CREATE POLICY "Admins can view all profiles" ON profiles
    FOR SELECT USING (is_admin());

CREATE POLICY "Admins can insert profiles" ON profiles
    FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "Admins can update profiles" ON profiles
    FOR UPDATE USING (is_admin());

CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth_user_id = auth.uid());

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth_user_id = auth.uid());

-- Sections policies
CREATE POLICY "Admins can manage sections" ON sections
    FOR ALL USING (is_admin());

CREATE POLICY "Students can view own section" ON sections
    FOR SELECT USING (id = current_user_section());

-- Rooms policies
CREATE POLICY "Admins can manage rooms" ON rooms
    FOR ALL USING (is_admin());

CREATE POLICY "Anyone can view active rooms" ON rooms
    FOR SELECT USING (is_active = true);

-- Schedules policies
CREATE POLICY "Admins can manage schedules" ON schedules
    FOR ALL USING (is_admin());

CREATE POLICY "Students can view own schedules" ON schedules
    FOR SELECT USING (section_id = current_user_section() AND is_active = true);

-- Occupations policies
CREATE POLICY "Admins can manage occupations" ON occupations
    FOR ALL USING (is_admin());

CREATE POLICY "Students can view own occupations" ON occupations
    FOR SELECT USING (section_id = current_user_section());

CREATE POLICY "Students can create occupations" ON occupations
    FOR INSERT WITH CHECK (section_id = current_user_section());

CREATE POLICY "Students can update own occupations" ON occupations
    FOR UPDATE USING (section_id = current_user_section());

-- Room submissions policies
CREATE POLICY "Admins can manage submissions" ON room_submissions
    FOR ALL USING (is_admin());

CREATE POLICY "Students can view own submissions" ON room_submissions
    FOR SELECT USING (section_id = current_user_section());

CREATE POLICY "Students can insert own submissions" ON room_submissions
    FOR INSERT WITH CHECK (section_id = current_user_section() AND submitted_by IN (
        SELECT id FROM profiles WHERE auth_user_id = auth.uid()
    ));

-- Report reasons policies
CREATE POLICY "Admins can manage report reasons" ON report_reasons
    FOR ALL USING (is_admin());

CREATE POLICY "Anyone can view active reasons" ON report_reasons
    FOR SELECT USING (is_active = true);

-- Reports policies
CREATE POLICY "Admins can manage reports" ON reports
    FOR ALL USING (is_admin());

CREATE POLICY "Students can view own reports" ON reports
    FOR SELECT USING (section_id = current_user_section());

CREATE POLICY "Students can insert own reports" ON reports
    FOR INSERT WITH CHECK (section_id = current_user_section() AND reported_by IN (
        SELECT id FROM profiles WHERE auth_user_id = auth.uid()
    ));

CREATE POLICY "Students cannot update report status" ON reports
    FOR UPDATE USING (section_id = current_user_section() AND reported_by IN (
        SELECT id FROM profiles WHERE auth_user_id = auth.uid()
    )) WITH CHECK (status = 'pending');

-- Compliance records policies
CREATE POLICY "Admins can manage compliance" ON compliance_records
    FOR ALL USING (is_admin());

CREATE POLICY "Students can view own compliance" ON compliance_records
    FOR SELECT USING (section_id = current_user_section());

-- Audit logs policies
CREATE POLICY "Admins can view audit logs" ON audit_logs
    FOR SELECT USING (is_admin());

CREATE POLICY "System can insert audit logs" ON audit_logs
    FOR INSERT WITH CHECK (true);

-- Notifications policies
CREATE POLICY "Users can view own notifications" ON notifications
    FOR SELECT USING (user_id IN (
        SELECT id FROM profiles WHERE auth_user_id = auth.uid()
    ));

CREATE POLICY "Users can update own notifications" ON notifications
    FOR UPDATE USING (user_id IN (
        SELECT id FROM profiles WHERE auth_user_id = auth.uid()
    ));