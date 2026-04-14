package com.marketplace.review;

import com.marketplace.booking.Booking;
import com.marketplace.booking.BookingRepository;
import com.marketplace.booking.BookingStatus;
import com.marketplace.category.Category;
import com.marketplace.common.exception.BusinessException;
import com.marketplace.review.dto.CreateReviewRequest;
import com.marketplace.user.User;
import com.marketplace.user.UserService;
import com.marketplace.worker.WorkerProfile;
import com.marketplace.worker.WorkerRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReviewServiceTest {

    @Mock ReviewRepository  reviewRepository;
    @Mock BookingRepository bookingRepository;
    @Mock WorkerRepository  workerRepository;
    @Mock UserService       userService;

    @InjectMocks ReviewService reviewService;

    private UUID          customerId;
    private UUID          bookingId;
    private UUID          workerId;
    private User          customer;
    private WorkerProfile worker;
    private Booking       completedBooking;

    @BeforeEach
    void setUp() {
        customerId = UUID.randomUUID();
        bookingId  = UUID.randomUUID();
        workerId   = UUID.randomUUID();

        customer = User.builder().id(customerId).phone("+919876543210").role("CUSTOMER").build();

        User workerUser = User.builder()
                .id(UUID.randomUUID()).phone("+919000000001")
                .name("Ramu Plumber").role("WORKER").build();
        worker = WorkerProfile.builder()
                .id(workerId).user(workerUser)
                .verificationStatus("VERIFIED").isAvailable(true)
                .avgRating(BigDecimal.ZERO).build();

        Category category = Category.builder().id(UUID.randomUUID()).name("Plumber").build();

        completedBooking = Booking.builder()
                .id(bookingId)
                .customer(customer)
                .worker(worker)
                .category(category)
                .address("123 Main St")
                .scheduledAt(Instant.now().minus(1, ChronoUnit.DAYS))
                .status(BookingStatus.COMPLETED)
                .build();
    }

    // ── CREATE REVIEW ────────────────────────────────────────────────────────────

    @Test
    void createReview_success() {
        when(bookingRepository.findById(bookingId)).thenReturn(Optional.of(completedBooking));
        when(reviewRepository.existsByBookingId(bookingId)).thenReturn(false);
        when(userService.getById(customerId)).thenReturn(customer);
        when(reviewRepository.save(any())).thenReturn(null);
        when(workerRepository.findById(workerId)).thenReturn(Optional.of(worker));
        when(reviewRepository.findAvgRatingByWorkerId(workerId)).thenReturn(Optional.of(4.5));

        CreateReviewRequest req = new CreateReviewRequest(bookingId, 5, "Great work!");

        assertThatNoException().isThrownBy(() -> reviewService.createReview(customerId, req));
        verify(reviewRepository).save(any(Review.class));
        verify(workerRepository).save(worker); // avg rating updated
    }

    @Test
    void createReview_notCustomerOfBooking_throwsForbidden() {
        UUID anotherUserId = UUID.randomUUID();
        when(bookingRepository.findById(bookingId)).thenReturn(Optional.of(completedBooking));

        CreateReviewRequest req = new CreateReviewRequest(bookingId, 4, "OK");

        assertThatThrownBy(() -> reviewService.createReview(anotherUserId, req))
                .isInstanceOf(BusinessException.class)
                .extracting(e -> ((BusinessException) e).getStatus())
                .isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void createReview_bookingNotCompleted_throws() {
        completedBooking.setStatus(BookingStatus.CONFIRMED);
        when(bookingRepository.findById(bookingId)).thenReturn(Optional.of(completedBooking));

        CreateReviewRequest req = new CreateReviewRequest(bookingId, 3, "Still in progress");

        assertThatThrownBy(() -> reviewService.createReview(customerId, req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("completed");
    }

    @Test
    void createReview_duplicate_throwsConflict() {
        when(bookingRepository.findById(bookingId)).thenReturn(Optional.of(completedBooking));
        when(reviewRepository.existsByBookingId(bookingId)).thenReturn(true);

        CreateReviewRequest req = new CreateReviewRequest(bookingId, 5, "Again");

        assertThatThrownBy(() -> reviewService.createReview(customerId, req))
                .isInstanceOf(BusinessException.class)
                .extracting(e -> ((BusinessException) e).getStatus())
                .isEqualTo(HttpStatus.CONFLICT);
    }

    // ── AVG RATING UPDATE ────────────────────────────────────────────────────────

    @Test
    void createReview_workerAvgRatingUpdated() {
        when(bookingRepository.findById(bookingId)).thenReturn(Optional.of(completedBooking));
        when(reviewRepository.existsByBookingId(bookingId)).thenReturn(false);
        when(userService.getById(customerId)).thenReturn(customer);
        when(reviewRepository.save(any())).thenReturn(null);
        when(workerRepository.findById(workerId)).thenReturn(Optional.of(worker));
        when(reviewRepository.findAvgRatingByWorkerId(workerId)).thenReturn(Optional.of(3.75));

        reviewService.createReview(customerId, new CreateReviewRequest(bookingId, 4, "Good"));

        ArgumentCaptor<WorkerProfile> captor = ArgumentCaptor.forClass(WorkerProfile.class);
        verify(workerRepository).save(captor.capture());
        assertThat(captor.getValue().getAvgRating()).isEqualByComparingTo("3.75");
    }

    @Test
    void createReview_noExistingAvg_workerNotSaved() {
        when(bookingRepository.findById(bookingId)).thenReturn(Optional.of(completedBooking));
        when(reviewRepository.existsByBookingId(bookingId)).thenReturn(false);
        when(userService.getById(customerId)).thenReturn(customer);
        when(reviewRepository.save(any())).thenReturn(null);
        when(workerRepository.findById(workerId)).thenReturn(Optional.of(worker));
        when(reviewRepository.findAvgRatingByWorkerId(workerId)).thenReturn(Optional.empty());

        reviewService.createReview(customerId, new CreateReviewRequest(bookingId, 5, "Excellent"));

        // findAvgRatingByWorkerId returns empty → ifPresent callback skipped → no save
        verify(workerRepository, never()).save(any());
    }
}
