/*
  # Create admin user account

  Creates the initial admin user for the dashboard using Supabase auth.
  Email: admin@voiceofpreemies.org
  Password: VoP@Admin2024!
*/

-- Insert admin user directly into auth.users
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token,
  aud,
  role
)
SELECT
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'admin@voiceofpreemies.org',
  crypt('VoP@Admin2024!', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"Admin"}',
  now(),
  now(),
  '',
  '',
  '',
  '',
  'authenticated',
  'authenticated'
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users WHERE email = 'admin@voiceofpreemies.org'
);
