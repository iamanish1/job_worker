-- ============================================================
-- Remove all mock/seed data inserted by V8__seed_mock_data.sql
-- Only real registered users remain after this migration.
-- Delete in reverse FK dependency order to avoid constraint errors.
-- ============================================================

-- 1. Delete earnings for bookings involving mock workers
DELETE FROM earnings
WHERE booking_id IN (
    SELECT b.id FROM bookings b
    INNER JOIN worker_profiles wp ON wp.id = b.worker_id
    INNER JOIN users u ON u.id = wp.user_id
    WHERE u.id::text LIKE 'aaaaaaaa-0001-0001-0001-%'
);

-- 2. Delete reviews for bookings involving mock workers
DELETE FROM reviews
WHERE booking_id IN (
    SELECT b.id FROM bookings b
    INNER JOIN worker_profiles wp ON wp.id = b.worker_id
    INNER JOIN users u ON u.id = wp.user_id
    WHERE u.id::text LIKE 'aaaaaaaa-0001-0001-0001-%'
);

-- 3. Delete bookings for mock workers
DELETE FROM bookings
WHERE worker_id IN (
    SELECT wp.id FROM worker_profiles wp
    INNER JOIN users u ON u.id = wp.user_id
    WHERE u.id::text LIKE 'aaaaaaaa-0001-0001-0001-%'
);

-- 4. Delete worker_categories for mock workers
DELETE FROM worker_categories
WHERE worker_id IN (
    SELECT wp.id FROM worker_profiles wp
    INNER JOIN users u ON u.id = wp.user_id
    WHERE u.id::text LIKE 'aaaaaaaa-0001-0001-0001-%'
);

-- 5. Delete worker_profiles for mock workers
DELETE FROM worker_profiles
WHERE user_id IN (
    SELECT id FROM users
    WHERE id::text LIKE 'aaaaaaaa-0001-0001-0001-%'
);

-- 6. Delete mock users (notifications cascade automatically via ON DELETE CASCADE)
DELETE FROM users
WHERE id::text LIKE 'aaaaaaaa-0001-0001-0001-%';
