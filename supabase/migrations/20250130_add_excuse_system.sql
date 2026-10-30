-- Create excuse system tables

-- 1. exemption_days table - Admin creates days where submissions are not needed
CREATE TABLE IF NOT EXISTS exemption_days (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exemption_date DATE NOT NULL,
    exemption_type TEXT NOT NULL CHECK (exemption_type IN ('all_day', 'room_schedule', 'area_assignment')),
    section_id UUID REFERENCES sections(id) ON DELETE CASCADE,
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    area_id UUID REFERENCES areas(id) ON DELETE CASCADE,
    schedule_id UUID REFERENCES schedules(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(exemption_date, section_id, room_id, area_id, schedule_id)
);

-- 2. excuse_requests table - Students/special request excuses with proof
CREATE TABLE IF NOT EXISTS excuse_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    requested_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    excuse_date DATE NOT NULL,
    excuse_type TEXT NOT NULL CHECK (excuse_type IN ('all_day', 'room_schedule', 'area_assignment')),
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    area_id UUID REFERENCES areas(id) ON DELETE CASCADE,
    schedule_id UUID REFERENCES schedules(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    proof_image_url TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    admin_note TEXT,
    reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for exemption_days
CREATE INDEX IF NOT EXISTS idx_exemption_days_date ON exemption_days(exemption_date);
CREATE INDEX IF NOT EXISTS idx_exemption_days_section_id ON exemption_days(section_id);
CREATE INDEX IF NOT EXISTS idx_exemption_days_room_id ON exemption_days(room_id);
CREATE INDEX IF NOT EXISTS idx_exemption_days_area_id ON exemption_days(area_id);
CREATE INDEX IF NOT EXISTS idx_exemption_days_is_active ON exemption_days(is_active);

-- Indexes for excuse_requests
CREATE INDEX IF NOT EXISTS idx_excuse_requests_section_id ON excuse_requests(section_id);
CREATE INDEX IF NOT EXISTS idx_excuse_requests_requested_by ON excuse_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_excuse_requests_excuse_date ON excuse_requests(excuse_date);
CREATE INDEX IF NOT EXISTS idx_excuse_requests_status ON excuse_requests(status);
CREATE INDEX IF NOT EXISTS idx_excuse_requests_room_id ON excuse_requests(room_id);
CREATE INDEX IF NOT EXISTS idx_excuse_requests_area_id ON excuse_requests(area_id);

-- Updated at triggers
DROP TRIGGER IF EXISTS update_exemption_days_updated_at ON exemption_days;
CREATE TRIGGER update_exemption_days_updated_at BEFORE UPDATE ON exemption_days FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_excuse_requests_updated_at ON excuse_requests;
CREATE TRIGGER update_excuse_requests_updated_at BEFORE UPDATE ON excuse_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
