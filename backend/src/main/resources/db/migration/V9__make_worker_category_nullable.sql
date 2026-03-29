-- Allow worker_profiles.category_id to be NULL for newly registered workers
-- who haven't completed onboarding yet. It gets filled in during the onboarding flow.
ALTER TABLE worker_profiles
    ALTER COLUMN category_id DROP NOT NULL;
