package com.marketplace.review;

import com.marketplace.booking.Booking;
import com.marketplace.booking.BookingRepository;
import com.marketplace.booking.BookingStatus;
import com.marketplace.common.exception.BusinessException;
import com.marketplace.common.exception.NotFoundException;
import com.marketplace.common.response.PageResponse;
import com.marketplace.review.dto.CreateReviewRequest;
import com.marketplace.user.UserService;
import com.marketplace.worker.WorkerProfile;
import com.marketplace.worker.WorkerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ReviewService {

    private final ReviewRepository  reviewRepository;
    private final BookingRepository bookingRepository;
    private final WorkerRepository  workerRepository;
    private final UserService       userService;

    @Transactional
    public void createReview(UUID customerId, CreateReviewRequest request) {
        Booking booking = bookingRepository.findById(request.bookingId())
                .orElseThrow(() -> new NotFoundException("Booking", request.bookingId()));

        // Guard: only the customer of this booking can review
        if (!booking.getCustomer().getId().equals(customerId)) {
            throw new BusinessException("Not authorized to review this booking",
                    HttpStatus.FORBIDDEN);
        }
        if (booking.getStatus() != BookingStatus.COMPLETED) {
            throw new BusinessException("Can only review completed bookings");
        }
        if (reviewRepository.existsByBookingId(request.bookingId())) {
            throw new BusinessException("Booking already reviewed", HttpStatus.CONFLICT);
        }

        Review review = Review.builder()
                .booking(booking)
                .reviewer(userService.getById(customerId))
                .worker(booking.getWorker())
                .rating(request.rating())
                .comment(request.comment())
                .build();
        reviewRepository.save(review);

        // Recalculate worker average rating
        updateWorkerRating(booking.getWorker().getId());
    }

    @Transactional(readOnly = true)
    public PageResponse<ReviewDTO> getWorkerReviews(UUID workerId, int page, int size) {
        return new PageResponse<>(
            reviewRepository.findByWorkerIdOrderByCreatedAtDesc(
                workerId, PageRequest.of(page, Math.min(size, 50)))
            .map(r -> new ReviewDTO(
                r.getId(),
                r.getBooking().getId(),
                r.getReviewer().getName(),
                r.getReviewer().getProfilePhoto(),
                r.getRating(),
                r.getComment(),
                r.getCreatedAt()
            ))
        );
    }

    private void updateWorkerRating(UUID workerId) {
        WorkerProfile worker = workerRepository.findById(workerId)
                .orElseThrow(() -> new NotFoundException("Worker", workerId));
        reviewRepository.findAvgRatingByWorkerId(workerId).ifPresent(avg -> {
            worker.setAvgRating(BigDecimal.valueOf(avg).setScale(2, RoundingMode.HALF_UP));
            workerRepository.save(worker);
        });
    }

    public record ReviewDTO(
        java.util.UUID id,
        java.util.UUID bookingId,
        String reviewerName,
        String reviewerPhoto,
        Integer rating,
        String comment,
        java.time.Instant createdAt
    ) {}
}
