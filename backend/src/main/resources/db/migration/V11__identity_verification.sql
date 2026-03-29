-- Identity verification flags on worker profiles
ALTER TABLE worker_profiles
    ADD COLUMN aadhaar_verified BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN face_verified    BOOLEAN NOT NULL DEFAULT FALSE;
