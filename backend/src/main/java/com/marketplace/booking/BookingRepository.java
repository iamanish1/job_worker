package com.marketplace.booking;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface BookingRepository extends JpaRepository<Booking, UUID> {

    Optional<Booking> findByIdempotencyKey(String idempotencyKey);

    Page<Booking> findByCustomerIdOrderByCreatedAtDesc(UUID customerId, Pageable pageable);

    Page<Booking> findByWorkerIdOrderByCreatedAtDesc(UUID workerId, Pageable pageable);

    /** Check for overlapping bookings to prevent double-booking */
    @Query("""
        SELECT COUNT(b) > 0 FROM Booking b
        WHERE b.worker.id = :workerId
          AND b.status IN :statuses
          AND b.scheduledAt BETWEEN :start AND :end
        """)
    boolean hasConflict(
        @Param("workerId") UUID workerId,
        @Param("statuses") Collection<BookingStatus> statuses,
        @Param("start")    Instant start,
        @Param("end")      Instant end
    );

    /** Used by expiry scheduler */
    @Query("""
        SELECT b FROM Booking b
        WHERE b.status = :status
          AND b.createdAt < :cutoff
        """)
    List<Booking> findExpiredPendingBookings(
        @Param("status") BookingStatus status,
        @Param("cutoff") Instant cutoff
    );

    /** Active bookings for a worker */
    @Query("""
        SELECT b FROM Booking b
        WHERE b.worker.id = :workerId
          AND b.status IN :statuses
        ORDER BY b.scheduledAt ASC
        """)
    List<Booking> findActiveForWorker(
        @Param("workerId") UUID workerId,
        @Param("statuses") Collection<BookingStatus> statuses
    );
}
