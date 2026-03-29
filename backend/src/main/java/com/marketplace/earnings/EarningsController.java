package com.marketplace.earnings;

import com.marketplace.auth.AuthenticatedUser;
import com.marketplace.common.exception.NotFoundException;
import com.marketplace.common.response.ApiResponse;
import com.marketplace.common.response.PageResponse;
import com.marketplace.worker.WorkerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;

@RestController
@RequestMapping("/api/earnings")
@RequiredArgsConstructor
public class EarningsController {

    private final EarningRepository earningRepository;
    private final WorkerRepository  workerRepository;

    @GetMapping("/summary")
    @PreAuthorize("hasRole('WORKER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getSummary(
            @AuthenticationPrincipal AuthenticatedUser principal) {
        var wp = workerRepository.findByUserId(principal.getUserId())
                .orElseThrow(() -> new NotFoundException("Worker profile not found"));

        BigDecimal total   = earningRepository.sumNetByWorkerId(wp.getId());
        BigDecimal today   = earningRepository.sumNetByWorkerIdSince(
            wp.getId(), Instant.now().truncatedTo(ChronoUnit.DAYS));
        BigDecimal week    = earningRepository.sumNetByWorkerIdSince(
            wp.getId(), Instant.now().minus(7, ChronoUnit.DAYS));
        BigDecimal month   = earningRepository.sumNetByWorkerIdSince(
            wp.getId(), Instant.now().minus(30, ChronoUnit.DAYS));

        return ResponseEntity.ok(ApiResponse.ok(Map.of(
            "total", total, "today", today, "week", week, "month", month
        )));
    }

    @GetMapping("/history")
    @PreAuthorize("hasRole('WORKER')")
    public ResponseEntity<ApiResponse<PageResponse<EarningDTO>>> getHistory(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size) {
        var wp = workerRepository.findByUserId(principal.getUserId())
                .orElseThrow(() -> new NotFoundException("Worker profile not found"));

        var result = earningRepository.findByWorkerIdOrderByCreatedAtDesc(
            wp.getId(), PageRequest.of(page, size))
            .map(e -> new EarningDTO(
                e.getId(),
                e.getBooking().getId(),
                e.getGrossAmount(),
                e.getPlatformFee(),
                e.getNetAmount(),
                e.getStatus(),
                e.getCreatedAt()
            ));
        return ResponseEntity.ok(ApiResponse.ok(new PageResponse<>(result)));
    }

    public record EarningDTO(
        java.util.UUID id,
        java.util.UUID bookingId,
        BigDecimal grossAmount,
        BigDecimal platformFee,
        BigDecimal netAmount,
        String status,
        Instant createdAt
    ) {}
}
