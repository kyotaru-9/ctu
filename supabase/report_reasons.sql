-- Report reasons
-- ==============
-- Populates the `report_reasons` table so students get a dropdown of options
-- when filing a report. Run this in the Supabase SQL editor (or psql) against
-- your project.
--
-- Two details the app depends on:
--   * every row must be is_active = true, because the student and special
--     report forms read the list through `GET /{student,special}/report-reasons`,
--     which filters on is_active.
--   * a reason named exactly 'Other' must exist. ReportsPage.jsx switches on
--     that exact string to reveal the free-text `other_reason` field, so
--     renaming it (e.g. to "Others") would silently break that field.
--
-- Re-running this is safe: the upsert below refreshes the description and
-- re-activates anything an admin turned off in Settings, instead of adding a
-- second copy of each reason.


-- 1. Make the reason name unique.
--
--    `report_reasons` shipped without a unique constraint on `name`, which is
--    why supabase/seed.sql could not use ON CONFLICT and why re-running that
--    seed duplicated rows. The upsert in step 2 needs a constraint to conflict
--    on, and the admin Settings page plus the analytics breakdown both assume
--    one row per reason.
--
--    This fails if the table already holds two reasons with the same name. To
--    check first:  SELECT name, count(*) FROM report_reasons GROUP BY name HAVING count(*) > 1;
--    If any come back, delete the duplicates before running this script.
CREATE UNIQUE INDEX IF NOT EXISTS report_reasons_name_key ON report_reasons (name);


-- 2. Insert the reason set, or refresh it if it is already there.
INSERT INTO report_reasons (name, description, is_active)
VALUES
    ('Trash left in room',             'Garbage, wrappers, or other waste materials left behind'),
    ('Dirty floor',                    'Floor has visible dirt, stains, or spills'),
    ('Dirty chairs/desks',             'Chairs or desks have dust, stains, or writing on them'),
    ('Improperly arranged chairs',     'Chairs and desks not returned to their proper arrangement'),
    ('Dust/dirt present',              'Visible dust on surfaces, window sills, or equipment'),
    ('Food waste',                     'Food remnants, crumbs, or spilled drinks'),
    ('Spilled liquid',                 'Spilled drinks or other liquids on desks or the floor'),
    ('Unclean board',                  'Whiteboard or blackboard has old markings or eraser dust'),
    ('Dirty windows/glass',            'Windows, glass panels, or partitions are dirty or smudged'),
    ('Waste bin not emptied',          'Waste bin is full, overflowing, or was not emptied'),
    ('Damaged or messy classroom area', 'Broken furniture, vandalism, or general disarray'),
    ('Cleaning supplies missing',      'Soap, disinfectant, or other supplies are not available'),
    ('Other',                          'Any other issue not listed above')
ON CONFLICT (name) DO UPDATE
SET description = EXCLUDED.description,
    is_active   = true;


-- 3. Verify: this is the list students will see in the report form.
SELECT name, description, is_active
FROM report_reasons
WHERE is_active
ORDER BY name;
