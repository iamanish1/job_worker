-- Add per-category years of experience to the worker_categories junction table
ALTER TABLE worker_categories
    ADD COLUMN years_experience INT NOT NULL DEFAULT 0;
