# Educators Table Migration

This migration replaces the free-text `instructor_name` field in schedules with a proper `educators` table with foreign key relationships.

## Files Changed

### 1. Database Migration
**File:** `supabase/migrations/20250127_add_educators_table.sql`

This SQL file:
- Creates the `educators` table with `id`, `name`, `department`, `is_active`, and timestamps
- Adds `educator_id` column to `schedules` table
- Migrates existing instructor names to the educators table
- Drops the old `instructor_name` column
- Adds indexes for performance
- Enables RLS with appropriate policies
- Adds updated_at trigger

**To run:** Execute this file in your Supabase SQL editor or migration tool.

### 2. Server Changes
**File:** `server/src/routes/admin.js`

Changes:
- Updated `SCHEDULE_SELECT` to include `educator:educators(*)`
- Updated `OCCUPATION_EMBEDS` to include educator in schedule embed
- Added educators CRUD endpoints (GET, POST, PUT, DELETE)
- Updated batch upload to:
  - Resolve instructor names to educator IDs
  - Create new educators automatically for unknown names
  - Use `educator_id` instead of `instructor_name`

### 3. Client Changes

**New File:** `client/src/services/educatorService.js`
- Service for fetching and managing educators

**Updated File:** `client/src/pages/admin/Schedules.jsx`
- Added educator state and fetch
- Changed form from text input to dropdown for instructor selection
- Updated all references from `instructor_name` to `educator_id` and `educator.name`
- Updated search to include educator name
- Updated detail view to show educator name and department

**No changes needed:** `client/src/features/schedules/SchedulesBatchUploadModal.jsx`
- The batch upload still accepts instructor names as text
- Server automatically creates educators from names during import

## How It Works

### Creating a Schedule
1. Admin selects from dropdown of existing educators
2. Dropdown shows: "Name (Department)"
3. System stores `educator_id` reference

### Batch Upload
1. Admin uploads Excel with instructor names
2. Server looks up each name in educators table
3. If educator doesn't exist, creates it with department "General"
4. Stores `educator_id` reference in schedule

### Display
- Schedule table shows educator name
- Detail view shows educator name and department
- If no educator assigned, shows "—"

## Migration Steps

1. **Run the SQL migration** in Supabase:
   ```sql
   -- Execute supabase/migrations/20250127_add_educators_table.sql
   ```

2. **Restart the server** to pick up the route changes:
   ```bash
   npm run dev
   ```

3. **Test the UI:**
   - Navigate to Schedules page
   - Try adding a new schedule (should see educator dropdown)
   - Try editing an existing schedule
   - Try batch upload with instructor names

## Rollback Plan

If needed, you can rollback by:
1. Restore from backup before migration
2. Or manually:
   ```sql
   ALTER TABLE schedules ADD COLUMN instructor_name TEXT;
   UPDATE schedules s SET instructor_name = e.name FROM educators e WHERE s.educator_id = e.id;
   ALTER TABLE schedules DROP COLUMN educator_id;
   DROP TABLE educators;
   ```

## Notes

- Old `instructor_name` column is dropped during migration
- All existing instructor names are preserved as educators
- Department defaults to "General" for migrated educators
- Educators can be deactivated (soft delete) rather than deleted
- RLS policies ensure only admins can manage educators
