-- Add multiple before and after image columns to cleaning_records table
-- =============================================================

-- Add additional image columns
ALTER TABLE cleaning_records
ADD COLUMN IF NOT EXISTS before_image_url_2 TEXT,
ADD COLUMN IF NOT EXISTS after_image_url_2 TEXT;

-- Add captured_at timestamps for the second images
ALTER TABLE cleaning_records
ADD COLUMN IF NOT EXISTS before_captured_at_2 TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS after_captured_at_2 TIMESTAMP WITH TIME ZONE;

-- Add comment to document the change
COMMENT ON COLUMN cleaning_records.before_image_url IS 'First before photo of the cleaning area';
COMMENT ON COLUMN cleaning_records.before_image_url_2 IS 'Second before photo of the cleaning area';
COMMENT ON COLUMN cleaning_records.after_image_url IS 'First after photo of the cleaning area';
COMMENT ON COLUMN cleaning_records.after_image_url_2 IS 'Second after photo of the cleaning area';

-- Migration complete
