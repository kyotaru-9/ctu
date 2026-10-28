-- Rotational Cleaning Seed Data Migration
-- =======================================
-- This migration creates sample areas and assignments for the rotational cleaning feature

-- Step 1: Insert sample cleaning areas
INSERT INTO areas (name, floor, description, is_active) VALUES
  ('Main Hallway - Ground Floor', 'Ground Floor', 'Main corridor from entrance to classrooms', true),
  ('Main Hallway - Second Floor', 'Second Floor', 'Main corridor on second level', true),
  ('Stairwell A', 'All Floors', 'Primary stairwell near the main entrance', true),
  ('Stairwell B', 'All Floors', 'Secondary stairwell near the back exit', true),
  ('Restroom - Ground Floor', 'Ground Floor', 'Restrooms on ground floor', true),
  ('Restroom - Second Floor', 'Second Floor', 'Restrooms on second floor', true),
  ('Cafeteria Area', 'Ground Floor', 'Cafeteria and surrounding eating area', true),
  ('Library Entrance', 'Second Floor', 'Library entrance and reception area', true)
ON CONFLICT DO NOTHING;

-- Step 2: Create area assignments for the test section
-- This assigns section aab6c863-86ab-4903-8e45-19a28f75646b to different areas each day
-- Day 1 = Monday, Day 2 = Tuesday, Day 3 = Wednesday, etc.

INSERT INTO area_assignments (section_id, area_id, day_of_week, is_active)
SELECT
  'aab6c863-86ab-4903-8e45-19a28f75646b'::uuid,
  areas.id,
  day_of_week,
  true
FROM (
  VALUES
    (1, 'Main Hallway - Ground Floor'),
    (2, 'Main Hallway - Second Floor'),
    (3, 'Stairwell A'),
    (4, 'Stairwell B'),
    (5, 'Restroom - Ground Floor'),
    (6, 'Restroom - Second Floor'),
    (7, 'Cafeteria Area')
) AS assignments(day_of_week, area_name)
JOIN areas ON areas.name = assignments.area_name
ON CONFLICT (section_id, area_id, day_of_week) DO NOTHING;

-- Migration complete
