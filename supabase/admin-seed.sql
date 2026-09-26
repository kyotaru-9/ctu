INSERT INTO profiles (auth_user_id, role, full_name, email, is_active)
VALUES (
  'USER_ID_FROM_STEP_1',  -- UUID from auth.users
  'admin',
  'System Administrator',
  'admin@ctu.edu.ph',
  true
);