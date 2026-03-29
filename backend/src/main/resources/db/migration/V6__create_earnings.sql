CREATE TABLE earnings (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id    UUID        NOT NULL REFERENCES worker_profiles(id),
    booking_id   UUID        NOT NULL REFERENCES bookings(id),
    gross_amount NUMERIC(10,2) NOT NULL,
    platform_fee NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    net_amount   NUMERIC(10,2) NOT NULL,
    status       VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    settled_at   TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_earning_status CHECK (status IN ('PENDING','SETTLED'))
);

CREATE INDEX idx_earnings_worker ON earnings(worker_id);
CREATE INDEX idx_earnings_status ON earnings(status);
