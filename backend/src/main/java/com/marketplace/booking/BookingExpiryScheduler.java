package com.marketplace.booking;

import com.marketplace.notification.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class BookingExpiryScheduler {

    private final BookingRepository   bookingRepository;
    private final NotificationService notificationService;

    @Value("${app.booking.expiry-minutes:30}")
    private int expiryMinutes;

    /** Runs every 5 minutes. Marks PENDING bookings older than expiryMinutes as EXPIRED. */
    @Scheduled(fixedRate = 300_000)
    @Transactional
    public void expireStaleBookings() {
        Instant cutoff = Instant.now().minus(expiryMinutes, ChronoUnit.MINUTES);
        List<Booking> stale = bookingRepository.findExpiredPendingBookings(BookingStatus.PENDING, cutoff);

        if (stale.isEmpty()) return;

        log.info("Expiring {} stale bookings", stale.size());
        stale.forEach(booking -> {
            booking.setStatus(BookingStatus.EXPIRED);
            booking.setCancelledBy("SYSTEM");
            booking.setCancellationReason("Worker did not respond within " + expiryMinutes + " minutes");
            bookingRepository.save(booking);
            notificationService.sendBookingExpired(booking);
        });
    }
}
