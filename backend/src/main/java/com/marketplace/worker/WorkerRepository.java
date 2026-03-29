package com.marketplace.worker;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface WorkerRepository extends JpaRepository<WorkerProfile, UUID> {

    Optional<WorkerProfile> findByUserId(UUID userId);

    @Query("""
        SELECT w FROM WorkerProfile w
        JOIN FETCH w.user u
        LEFT JOIN FETCH w.category c
        WHERE w.verificationStatus = 'VERIFIED'
          AND (:categoryId IS NULL OR c.id = :categoryId)
          AND (:city       IS NULL OR LOWER(w.city) LIKE CONCAT('%', LOWER(CAST(:city AS string)), '%'))
          AND (:available  IS NULL OR w.isAvailable = :available)
        ORDER BY w.avgRating DESC, w.totalJobs DESC
        """)
    Page<WorkerProfile> findVerifiedWorkers(
        @Param("categoryId") UUID categoryId,
        @Param("city")       String city,
        @Param("available")  Boolean available,
        Pageable pageable
    );
}
