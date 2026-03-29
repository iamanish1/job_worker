UPDATE bookings b
SET final_amount = COALESCE(
    NULLIF(b.quoted_amount, 0),
    NULLIF(wp.daily_rate, 0),
    NULLIF(wp.hourly_rate, 0),
    0
)
FROM worker_profiles wp
WHERE wp.id = b.worker_id
  AND b.status = 'COMPLETED'
  AND (b.final_amount IS NULL OR b.final_amount = 0);

UPDATE earnings e
SET gross_amount = COALESCE(
        NULLIF(b.final_amount, 0),
        NULLIF(b.quoted_amount, 0),
        NULLIF(wp.daily_rate, 0),
        NULLIF(wp.hourly_rate, 0),
        0
    ),
    net_amount = COALESCE(
        NULLIF(b.final_amount, 0),
        NULLIF(b.quoted_amount, 0),
        NULLIF(wp.daily_rate, 0),
        NULLIF(wp.hourly_rate, 0),
        0
    ),
    platform_fee = 0,
    status = 'SETTLED',
    settled_at = COALESCE(e.settled_at, b.completed_at, e.created_at)
FROM bookings b
JOIN worker_profiles wp ON wp.id = b.worker_id
WHERE e.booking_id = b.id
  AND (
      e.gross_amount = 0 OR
      e.net_amount = 0 OR
      e.status <> 'SETTLED'
  );
