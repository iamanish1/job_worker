CREATE TABLE reviews (
    id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id  UUID    UNIQUE NOT NULL REFERENCES bookings(id),
    reviewer_id UUID    NOT NULL REFERENCES users(id),
    worker_id   UUID    NOT NULL REFERENCES worker_profiles(id),
    rating      INTEGER NOT NULL,
    comment     TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_rating CHECK (rating BETWEEN 1 AND 5)
);

CREATE INDEX idx_reviews_worker ON reviews(worker_id);
