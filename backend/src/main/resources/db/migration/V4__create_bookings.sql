CREATE TABLE bookings (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id         UUID        NOT NULL REFERENCES users(id),
    worker_id           UUID        NOT NULL REFERENCES worker_profiles(id),
    category_id         UUID        NOT NULL REFERENCES categories(id),
    status              VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    description         TEXT,
    address             TEXT        NOT NULL,
    latitude            NUMERIC(9,6),
    longitude           NUMERIC(9,6),
    scheduled_at        TIMESTAMPTZ NOT NULL,
    confirmed_at        TIMESTAMPTZ,
    started_at          TIMESTAMPTZ,
    completed_at        TIMESTAMPTZ,
    cancelled_at        TIMESTAMPTZ,
    cancellation_reason TEXT,
    cancelled_by        VARCHAR(20),
    quoted_amount       NUMERIC(10,2),
    final_amount        NUMERIC(10,2),
    payment_status      VARCHAR(30) NOT NULL DEFAULT 'UNPAID',
    otp_code_hash       VARCHAR(64),
    idempotency_key     VARCHAR(64) UNIQUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_booking_status CHECK (
        status IN ('PENDING','CONFIRMED','IN_PROGRESS','COMPLETED','CANCELLED','EXPIRED')
    ),
    CONSTRAINT chk_cancelled_by CHECK (
        cancelled_by IS NULL OR cancelled_by IN ('CUSTOMER','WORKER','SYSTEM')
    ),
    CONSTRAINT chk_payment_status CHECK (
        payment_status IN ('UNPAID','PAID','REFUNDED')
    )
);

CREATE INDEX idx_bookings_customer   ON bookings(customer_id);
CREATE INDEX idx_bookings_worker     ON bookings(worker_id);
CREATE INDEX idx_bookings_status     ON bookings(status);
CREATE INDEX idx_bookings_scheduled  ON bookings(scheduled_at);
-- Index for expiry scheduler query
CREATE INDEX idx_bookings_expiry     ON bookings(status, created_at)
    WHERE status = 'PENDING';

CREATE TRIGGER trg_bookings_updated_at
    BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
