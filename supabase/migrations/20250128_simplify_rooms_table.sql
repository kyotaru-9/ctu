-- Simplify rooms table to only include room_code, floor, and description
-- Remove room_name and building columns

-- Remove room_name column (NOT NULL constraint must be dropped first)
ALTER TABLE rooms ALTER COLUMN room_name DROP NOT NULL;
ALTER TABLE rooms DROP COLUMN room_name;

-- Remove building column
ALTER TABLE rooms DROP COLUMN building;
