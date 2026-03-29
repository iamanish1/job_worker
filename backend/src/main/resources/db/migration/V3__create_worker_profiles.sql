CREATE TABLE worker_profiles (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID        UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id         UUID        NOT NULL REFERENCES categories(id),
    bio                 TEXT,
    years_experience    INTEGER     NOT NULL DEFAULT 0,
    hourly_rate         NUMERIC(10,2),
    daily_rate          NUMERIC(10,2),
    city                VARCHAR(100) NOT NULL DEFAULT '',
    locality            VARCHAR(150),
    latitude            NUMERIC(9,6),
    longitude           NUMERIC(9,6),
    is_available        BOOLEAN     NOT NULL DEFAULT FALSE,
    verification_status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    avg_rating          NUMERIC(3,2) NOT NULL DEFAULT 0.00,
    total_jobs          INTEGER     NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_verification_status CHECK (
        verification_status IN ('PENDING','UNDER_REVIEW','VERIFIED','REJECTED')
    )
);

CREATE INDEX idx_worker_category    ON worker_profiles(category_id);
CREATE INDEX idx_worker_city        ON worker_profiles(city);
CREATE INDEX idx_worker_available   ON worker_profiles(is_available);
CREATE INDEX idx_worker_verified    ON worker_profiles(verification_status);

CREATE TRIGGER trg_worker_profiles_updated_at
    BEFORE UPDATE ON worker_profiles
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Documents table
CREATE TABLE worker_documents (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id       UUID        NOT NULL REFERENCES worker_profiles(id) ON DELETE CASCADE,
    doc_type        VARCHAR(50) NOT NULL,
    s3_key          TEXT        NOT NULL,
    status          VARCHAR(30) NOT NULL DEFAULT 'UPLOADED',
    rejection_note  TEXT,
    uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_doc_type   CHECK (doc_type IN ('AADHAAR_FRONT','AADHAAR_BACK','PAN','PHOTO','CERTIFICATE','OTHER')),
    CONSTRAINT chk_doc_status CHECK (status IN ('UPLOADED','VERIFIED','REJECTED'))
);

CREATE INDEX idx_docs_worker ON worker_documents(worker_id);
