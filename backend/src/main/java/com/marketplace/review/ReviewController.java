package com.marketplace.review;

import com.marketplace.auth.AuthenticatedUser;
import com.marketplace.common.response.ApiResponse;
import com.marketplace.common.response.PageResponse;
import com.marketplace.review.dto.CreateReviewRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewService reviewService;

    @PostMapping("/reviews")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<Void>> createReview(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @Valid @RequestBody CreateReviewRequest request) {
        reviewService.createReview(principal.getUserId(), request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Review submitted", null));
    }

    @GetMapping("/reviews/my")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<PageResponse<ReviewService.MyReviewDTO>>> getMyReviews(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.ok(
            reviewService.getMyReviews(principal.getUserId(), page, size)));
    }

    @GetMapping("/workers/{workerId}/reviews")
    public ResponseEntity<ApiResponse<PageResponse<ReviewService.ReviewDTO>>> getWorkerReviews(
            @PathVariable UUID workerId,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(ApiResponse.ok(
            reviewService.getWorkerReviews(workerId, page, size)));
    }
}
