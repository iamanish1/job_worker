-- ============================================================
-- MOCK DATA SEED — for development & UI testing
-- 8 verified workers (one per category) in Mumbai
-- ============================================================

-- Worker users (fake phone numbers — for browsing only, not login)
INSERT INTO users (id, phone, name, role, is_active) VALUES
  ('aaaaaaaa-0001-0001-0001-000000000001', '+910000000001', 'Rajesh Kumar',    'WORKER', true),
  ('aaaaaaaa-0001-0001-0001-000000000002', '+910000000002', 'Suresh Sharma',   'WORKER', true),
  ('aaaaaaaa-0001-0001-0001-000000000003', '+910000000003', 'Amit Verma',      'WORKER', true),
  ('aaaaaaaa-0001-0001-0001-000000000004', '+910000000004', 'Deepak Gupta',    'WORKER', true),
  ('aaaaaaaa-0001-0001-0001-000000000005', '+910000000005', 'Priya Mishra',    'WORKER', true),
  ('aaaaaaaa-0001-0001-0001-000000000006', '+910000000006', 'Vikram Singh',    'WORKER', true),
  ('aaaaaaaa-0001-0001-0001-000000000007', '+910000000007', 'Mohit Yadav',     'WORKER', true),
  ('aaaaaaaa-0001-0001-0001-000000000008', '+910000000008', 'Sanjay Tiwari',   'WORKER', true)
ON CONFLICT (phone) DO NOTHING;

-- Worker profiles — VERIFIED, available, with ratings
INSERT INTO worker_profiles (
  user_id, category_id, bio,
  years_experience, daily_rate, hourly_rate,
  city, locality,
  is_available, verification_status, avg_rating, total_jobs
)
SELECT
  u.id,
  (SELECT id FROM categories WHERE name = 'Electrician'),
  'Expert electrician with 8 years of experience. Specializes in home wiring, fan installation, MCB panel repair, and short circuit fixing. Available for emergency calls.',
  8, 900.00, 180.00,
  'Mumbai', 'Andheri West',
  true, 'VERIFIED', 4.80, 234
FROM users u WHERE u.phone = '+910000000001'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO worker_profiles (
  user_id, category_id, bio,
  years_experience, daily_rate, hourly_rate,
  city, locality,
  is_available, verification_status, avg_rating, total_jobs
)
SELECT
  u.id,
  (SELECT id FROM categories WHERE name = 'Plumber'),
  'Certified plumber with 6 years of experience. Handle all kinds of plumbing work including pipe leakage, tap repair, geyser fitting, bathroom renovation and drain cleaning.',
  6, 800.00, 150.00,
  'Mumbai', 'Bandra East',
  true, 'VERIFIED', 4.65, 178
FROM users u WHERE u.phone = '+910000000002'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO worker_profiles (
  user_id, category_id, bio,
  years_experience, daily_rate, hourly_rate,
  city, locality,
  is_available, verification_status, avg_rating, total_jobs
)
SELECT
  u.id,
  (SELECT id FROM categories WHERE name = 'Carpenter'),
  'Skilled carpenter with 10 years experience in furniture making, door/window fitting, modular kitchen work, wardrobes and false ceiling. Quality work guaranteed.',
  10, 1100.00, 200.00,
  'Mumbai', 'Dadar',
  true, 'VERIFIED', 4.90, 312
FROM users u WHERE u.phone = '+910000000003'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO worker_profiles (
  user_id, category_id, bio,
  years_experience, daily_rate, hourly_rate,
  city, locality,
  is_available, verification_status, avg_rating, total_jobs
)
SELECT
  u.id,
  (SELECT id FROM categories WHERE name = 'Painter'),
  'Professional painter with 5 years experience. Expert in interior and exterior painting, waterproofing, putty work, texture painting and wall design.',
  5, 750.00, 140.00,
  'Mumbai', 'Goregaon',
  true, 'VERIFIED', 4.55, 145
FROM users u WHERE u.phone = '+910000000004'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO worker_profiles (
  user_id, category_id, bio,
  years_experience, daily_rate, hourly_rate,
  city, locality,
  is_available, verification_status, avg_rating, total_jobs
)
SELECT
  u.id,
  (SELECT id FROM categories WHERE name = 'Cleaner'),
  'Professional cleaning specialist with 4 years experience. Provide deep cleaning, sofa/carpet cleaning, kitchen cleaning, bathroom sanitisation and post-renovation cleaning.',
  4, 600.00, 120.00,
  'Mumbai', 'Malad',
  true, 'VERIFIED', 4.70, 198
FROM users u WHERE u.phone = '+910000000005'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO worker_profiles (
  user_id, category_id, bio,
  years_experience, daily_rate, hourly_rate,
  city, locality,
  is_available, verification_status, avg_rating, total_jobs
)
SELECT
  u.id,
  (SELECT id FROM categories WHERE name = 'AC Technician'),
  'Certified AC technician with 7 years experience. Expert in AC installation, gas refilling, servicing, cooling issues, and all major brands repair including Daikin, Voltas, LG.',
  7, 1000.00, 200.00,
  'Mumbai', 'Kandivali',
  true, 'VERIFIED', 4.85, 267
FROM users u WHERE u.phone = '+910000000006'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO worker_profiles (
  user_id, category_id, bio,
  years_experience, daily_rate, hourly_rate,
  city, locality,
  is_available, verification_status, avg_rating, total_jobs
)
SELECT
  u.id,
  (SELECT id FROM categories WHERE name = 'Mason'),
  'Experienced mason with 12 years in construction work. Specialises in brick laying, tile fixing, plastering, flooring, bathroom renovation and structural repairs.',
  12, 1200.00, 220.00,
  'Mumbai', 'Borivali',
  true, 'VERIFIED', 4.60, 389
FROM users u WHERE u.phone = '+910000000007'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO worker_profiles (
  user_id, category_id, bio,
  years_experience, daily_rate, hourly_rate,
  city, locality,
  is_available, verification_status, avg_rating, total_jobs
)
SELECT
  u.id,
  (SELECT id FROM categories WHERE name = 'Welder'),
  'Skilled welder with 9 years experience in MIG, TIG and arc welding. Handle gate fabrication, grill making, railing work, structural welding and all metal fabrication jobs.',
  9, 1050.00, 190.00,
  'Mumbai', 'Kurla',
  true, 'VERIFIED', 4.75, 210
FROM users u WHERE u.phone = '+910000000008'
ON CONFLICT (user_id) DO NOTHING;
