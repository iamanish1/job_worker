package com.marketplace.earnings;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Repository
public interface EarningRepository extends JpaRepository<Earning, UUID> {

    Page<Earning> findByWorkerIdOrderByCreatedAtDesc(UUID workerId, Pageable pageable);

    @Query("SELECT COALESCE(SUM(e.netAmount), 0) FROM Earning e WHERE e.worker.id = :workerId")
    BigDecimal sumNetByWorkerId(@Param("workerId") UUID workerId);

    @Query("""
        SELECT COALESCE(SUM(e.netAmount), 0) FROM Earning e
        WHERE e.worker.id = :workerId AND e.createdAt >= :since
        """)
    BigDecimal sumNetByWorkerIdSince(
        @Param("workerId") UUID workerId,
        @Param("since")    Instant since
    );
}
