package com.marketplace.review;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface ReviewRepository extends JpaRepository<Review, UUID> {

    Page<Review> findByWorkerIdOrderByCreatedAtDesc(UUID workerId, Pageable pageable);

    boolean existsByBookingId(UUID bookingId);

    long countByWorkerId(UUID workerId);

    @Query("SELECT AVG(r.rating) FROM Review r WHERE r.worker.id = :workerId")
    Optional<Double> findAvgRatingByWorkerId(@Param("workerId") UUID workerId);
}
