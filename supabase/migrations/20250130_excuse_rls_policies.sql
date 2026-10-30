-- RLS Policies for excuse system tables

-- Enable RLS on new tables
ALTER TABLE exemption_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE excuse_requests ENABLE ROW LEVEL SECURITY;

-- Exemption Days policies
DROP POLICY IF EXISTS "Admins can manage exemption days" ON exemption_days;
CREATE POLICY "Admins can manage exemption days" ON exemption_days
    FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "Students can view exemption days for their section" ON exemption_days;
CREATE POLICY "Students can view exemption days for their section" ON exemption_days
    FOR SELECT USING (
        section_id = current_user_section() OR
        section_id IS NULL
    );

-- Excuse Requests policies
DROP POLICY IF EXISTS "Admins can manage excuse requests" ON excuse_requests;
CREATE POLICY "Admins can manage excuse requests" ON excuse_requests
    FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "Students can view own excuse requests" ON excuse_requests;
CREATE POLICY "Students can view own excuse requests" ON excuse_requests
    FOR SELECT USING (section_id = current_user_section());

DROP POLICY IF EXISTS "Students can insert own excuse requests" ON excuse_requests;
CREATE POLICY "Students can insert own excuse requests" ON excuse_requests
    FOR INSERT WITH CHECK (
        section_id = current_user_section() AND
        requested_by IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Students cannot update excuse requests" ON excuse_requests;
CREATE POLICY "Students cannot update excuse requests" ON excuse_requests
    FOR UPDATE USING (false);
