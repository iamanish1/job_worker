CREATE TABLE notifications (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title      VARCHAR(200) NOT NULL,
    body       TEXT,
    type       VARCHAR(50),
    ref_id     UUID,
    is_read    BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notif_user   ON notifications(user_id);
-- Partial index: only unread rows — fast for unread count queries
CREATE INDEX idx_notif_unread ON notifications(user_id, created_at DESC)
    WHERE is_read = FALSE;
