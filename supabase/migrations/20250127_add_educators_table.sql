-- Complete Educators Table Migration
-- This file creates the educators table and fully integrates it with schedules
-- Run this file once to complete the migration

-- Step 1: Create educators table
CREATE TABLE IF NOT EXISTS educators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    department TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Add educator_id column to schedules table
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS educator_id UUID REFERENCES educators(id) ON DELETE SET NULL;

-- Step 3: Migrate existing instructor_name data to educators table
-- Insert unique instructors from schedules into educators table
INSERT INTO educators (name, department)
SELECT DISTINCT 
    instructor_name,
    'General' as department
FROM schedules
WHERE instructor_name IS NOT NULL
    AND instructor_name != ''
ON CONFLICT DO NOTHING;

-- Step 4: Update schedules to reference the new educator_id
UPDATE schedules s
SET educator_id = e.id
FROM educators e
WHERE s.instructor_name = e.name
    AND s.instructor_name IS NOT NULL
    AND s.instructor_name != '';

-- Step 5: Drop the old instructor_name column
ALTER TABLE schedules DROP COLUMN IF EXISTS instructor_name;

-- Step 6: Add indexes for educators table
CREATE INDEX IF NOT EXISTS idx_educators_name ON educators(name);
CREATE INDEX IF NOT EXISTS idx_educators_department ON educators(department);
CREATE INDEX IF NOT EXISTS idx_educators_is_active ON educators(is_active);

-- Step 7: Add index for schedules educator_id
CREATE INDEX IF NOT EXISTS idx_schedules_educator_id ON schedules(educator_id);

-- Step 8: Enable RLS on educators table
ALTER TABLE educators ENABLE ROW LEVEL SECURITY;

-- Step 9: Add RLS policies for educators table
DROP POLICY IF EXISTS "Admins can manage educators" ON educators;
CREATE POLICY "Admins can manage educators" ON educators
    FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "Anyone can view active educators" ON educators;
CREATE POLICY "Anyone can view active educators" ON educators
    FOR SELECT USING (is_active = true);

-- Step 10: Add updated_at trigger for educators table
DROP TRIGGER IF EXISTS update_educators_updated_at ON educators;
CREATE TRIGGER update_educators_updated_at 
    BEFORE UPDATE ON educators 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Step 11: Update schedules RLS policies to work with educator_id
-- (Optional: existing policies should still work, but we verify they're in place)
DROP POLICY IF EXISTS "Admins can manage schedules" ON schedules;
CREATE POLICY "Admins can manage schedules" ON schedules
    FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "Students can view own schedules" ON schedules;
CREATE POLICY "Students can view own schedules" ON schedules
    FOR SELECT USING (section_id = current_user_section() AND is_active = true);

-- Step 12: Verify the migration was successful
-- This select statement will show the educators created and their schedules
-- SELECT e.id, e.name, e.department, COUNT(s.id) as schedule_count
-- FROM educators e
-- LEFT JOIN schedules s ON s.educator_id = e.id
-- GROUP BY e.id, e.name, e.department
-- ORDER BY e.name;

-- Migration complete
-- The system now uses educators instead of instructor_name
