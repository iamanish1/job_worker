-- ============================================================
-- Remove all mock/seed data inserted by V8__seed_mock_data.sql
-- Only real registered users remain after this migration.
-- ============================================================

-- Delete worker_categories for mock workers (FK child first)
DELETE FROM worker_categories
WHERE worker_id IN (
    SELECT wp.id FROM worker_profiles wp
    INNER JOIN users u ON u.id = wp.user_id
    WHERE u.id::text LIKE 'aaaaaaaa-0001-0001-0001-%'
);

-- Delete worker_profiles for mock workers
DELETE FROM worker_profiles
WHERE user_id IN (
    SELECT id FROM users
    WHERE id::text LIKE 'aaaaaaaa-0001-0001-0001-%'
);

-- Delete mock users
DELETE FROM users
WHERE id::text LIKE 'aaaaaaaa-0001-0001-0001-%';
