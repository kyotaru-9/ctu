-- Rotational Cleaning Feature Migration
-- ====================================
-- This migration adds tables for the rotational cleaning system:
-- - areas: Cleaning areas with name, floor, and description
-- - area_assignments: Assigns sections to areas on specific days
-- - cleaning_records: Records of before/after photo submissions

-- Step 1: Create areas table
CREATE TABLE IF NOT EXISTS areas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    floor TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Create area_assignments table
CREATE TABLE IF NOT EXISTS area_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    area_id UUID NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 1 AND day_of_week <= 7),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(section_id, area_id, day_of_week)
);

-- Step 3: Create cleaning_records table
CREATE TABLE IF NOT EXISTS cleaning_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    area_id UUID NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
    before_image_url TEXT,
    after_image_url TEXT,
    before_captured_at TIMESTAMP WITH TIME ZONE,
    after_captured_at TIMESTAMP WITH TIME ZONE,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 4: Add indexes for areas table
CREATE INDEX IF NOT EXISTS idx_areas_name ON areas(name);
CREATE INDEX IF NOT EXISTS idx_areas_floor ON areas(floor);
CREATE INDEX IF NOT EXISTS idx_areas_is_active ON areas(is_active);

-- Step 5: Add indexes for area_assignments table
CREATE INDEX IF NOT EXISTS idx_area_assignments_section_id ON area_assignments(section_id);
CREATE INDEX IF NOT EXISTS idx_area_assignments_area_id ON area_assignments(area_id);
CREATE INDEX IF NOT EXISTS idx_area_assignments_day_of_week ON area_assignments(day_of_week);
CREATE INDEX IF NOT EXISTS idx_area_assignments_is_active ON area_assignments(is_active);

-- Step 6: Add indexes for cleaning_records table
CREATE INDEX IF NOT EXISTS idx_cleaning_records_section_id ON cleaning_records(section_id);
CREATE INDEX IF NOT EXISTS idx_cleaning_records_area_id ON cleaning_records(area_id);
CREATE INDEX IF NOT EXISTS idx_cleaning_records_status ON cleaning_records(status);
CREATE INDEX IF NOT EXISTS idx_cleaning_records_submitted_at ON cleaning_records(submitted_at);

-- Step 7: Enable RLS on areas table
ALTER TABLE areas ENABLE ROW LEVEL SECURITY;

-- Step 8: Add RLS policies for areas table
DROP POLICY IF EXISTS "Admins can manage areas" ON areas;
CREATE POLICY "Admins can manage areas" ON areas
    FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "Anyone can view active areas" ON areas;
CREATE POLICY "Anyone can view active areas" ON areas
    FOR SELECT USING (is_active = true);

-- Step 9: Enable RLS on area_assignments table
ALTER TABLE area_assignments ENABLE ROW LEVEL SECURITY;

-- Step 10: Add RLS policies for area_assignments table
DROP POLICY IF EXISTS "Admins can manage area_assignments" ON area_assignments;
CREATE POLICY "Admins can manage area_assignments" ON area_assignments
    FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "Students can view own assignments" ON area_assignments;
CREATE POLICY "Students can view own assignments" ON area_assignments
    FOR SELECT USING (section_id = current_user_section() AND is_active = true);

-- Step 11: Enable RLS on cleaning_records table
ALTER TABLE cleaning_records ENABLE ROW LEVEL SECURITY;

-- Step 12: Add RLS policies for cleaning_records table
DROP POLICY IF EXISTS "Admins can manage cleaning_records" ON cleaning_records;
CREATE POLICY "Admins can manage cleaning_records" ON cleaning_records
    FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "Students can view own cleaning_records" ON cleaning_records;
CREATE POLICY "Students can view own cleaning_records" ON cleaning_records
    FOR SELECT USING (section_id = current_user_section());

DROP POLICY IF EXISTS "Students can insert own cleaning_records" ON cleaning_records;
CREATE POLICY "Students can insert own cleaning_records" ON cleaning_records
    FOR INSERT WITH CHECK (section_id = current_user_section());

DROP POLICY IF EXISTS "Students can update own cleaning_records" ON cleaning_records;
CREATE POLICY "Students can update own cleaning_records" ON cleaning_records
    FOR UPDATE USING (section_id = current_user_section());

-- Step 13: Add updated_at triggers
DROP TRIGGER IF EXISTS update_areas_updated_at ON areas;
CREATE TRIGGER update_areas_updated_at
    BEFORE UPDATE ON areas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_area_assignments_updated_at ON area_assignments;
CREATE TRIGGER update_area_assignments_updated_at
    BEFORE UPDATE ON area_assignments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_cleaning_records_updated_at ON cleaning_records;
CREATE TRIGGER update_cleaning_records_updated_at
    BEFORE UPDATE ON cleaning_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Migration complete
