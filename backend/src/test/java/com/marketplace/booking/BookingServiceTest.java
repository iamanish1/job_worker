package com.marketplace.booking;

import com.marketplace.booking.dto.*;
import com.marketplace.category.Category;
import com.marketplace.category.CategoryRepository;
import com.marketplace.common.exception.BusinessException;
import com.marketplace.earnings.EarningRepository;
import com.marketplace.notification.NotificationService;
import com.marketplace.review.ReviewRepository;
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
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BookingServiceTest {

    @Mock BookingRepository   bookingRepository;
    @Mock WorkerRepository    workerRepository;
    @Mock CategoryRepository  categoryRepository;
    @Mock EarningRepository   earningRepository;
    @Mock NotificationService notificationService;
    @Mock ReviewRepository    reviewRepository;
    @Mock UserService         userService;

    @InjectMocks BookingService bookingService;

    private UUID        customerId;
    private UUID        workerProfileId;   // WorkerProfile.id
    private UUID        workerUserId;      // Worker's User.id (used in service calls)
    private UUID        categoryId;
    private User        customer;
    private WorkerProfile worker;
    private Category    category;

    @BeforeEach
    void setUp() {
        customerId      = UUID.randomUUID();
        workerProfileId = UUID.randomUUID();
        workerUserId    = UUID.randomUUID();
        categoryId      = UUID.randomUUID();

        customer = User.builder().id(customerId).phone("+919876543210").role("CUSTOMER").build();

        User workerUser = User.builder().id(workerUserId).phone("+919000000001").role("WORKER").build();
        worker = WorkerProfile.builder()
                .id(workerProfileId)
                .user(workerUser)
                .verificationStatus("VERIFIED")
                .isAvailable(true)
                .build();

        category = Category.builder().id(categoryId).name("Plumber").build();
    }

    // ── CREATE BOOKING ───────────────────────────────────────────────────────────

    @Test
    void createBooking_success() {
        CreateBookingRequest req = new CreateBookingRequest(
                workerProfileId, categoryId, "123 Main St", null, null,
                Instant.now().plus(1, ChronoUnit.DAYS),
                "Fix pipe", BigDecimal.valueOf(500), null);

        when(workerRepository.findById(workerProfileId)).thenReturn(Optional.of(worker));
        when(bookingRepository.hasConflict(any(), any(), any(), any())).thenReturn(false);
        when(categoryRepository.findById(categoryId)).thenReturn(Optional.of(category));
        when(userService.getById(customerId)).thenReturn(customer);
        when(reviewRepository.existsByBookingId(any())).thenReturn(false);

        Booking saved = Booking.builder()
                .id(UUID.randomUUID())
                .customer(customer).worker(worker).category(category)
                .address("123 Main St")
                .scheduledAt(req.scheduledAt())
                .quotedAmount(req.quotedAmount())
                .status(BookingStatus.PENDING)
                .otpCode("123456")
                .build();
        when(bookingRepository.save(any(Booking.class))).thenReturn(saved);

        BookingResponseDTO dto = bookingService.createBooking(customerId, req);

        assertThat(dto.status()).isEqualTo(BookingStatus.PENDING);
        assertThat(dto.otpCode()).isNotNull(); // OTP returned on creation
        verify(notificationService).sendBookingRequest(any(Booking.class));
    }

    @Test
    void createBooking_workerNotVerified_throws() {
        worker.setVerificationStatus("PENDING");
        when(workerRepository.findById(workerProfileId)).thenReturn(Optional.of(worker));

        CreateBookingRequest req = new CreateBookingRequest(
                workerProfileId, categoryId, "123 Main St", null, null,
                Instant.now().plus(1, ChronoUnit.DAYS), null, null, null);

        assertThatThrownBy(() -> bookingService.createBooking(customerId, req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("not verified");
    }

    @Test
    void createBooking_workerUnavailable_throws() {
        worker.setIsAvailable(false);
        when(workerRepository.findById(workerProfileId)).thenReturn(Optional.of(worker));

        CreateBookingRequest req = new CreateBookingRequest(
                workerProfileId, categoryId, "123 Main St", null, null,
                Instant.now().plus(1, ChronoUnit.DAYS), null, null, null);

        assertThatThrownBy(() -> bookingService.createBooking(customerId, req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("not available");
    }

    @Test
    void createBooking_conflictingSlot_throwsConflict() {
        when(workerRepository.findById(workerProfileId)).thenReturn(Optional.of(worker));
        when(bookingRepository.hasConflict(any(), any(), any(), any())).thenReturn(true);

        CreateBookingRequest req = new CreateBookingRequest(
                workerProfileId, categoryId, "123 Main St", null, null,
                Instant.now().plus(1, ChronoUnit.DAYS), null, null, null);

        assertThatThrownBy(() -> bookingService.createBooking(customerId, req))
                .isInstanceOf(BusinessException.class)
                .extracting(e -> ((BusinessException) e).getStatus())
                .isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void createBooking_idempotency_returnsCachedBooking() {
        String key = UUID.randomUUID().toString();
        Booking existing = Booking.builder()
                .id(UUID.randomUUID())
                .customer(customer).worker(worker).category(category)
                .address("123 Main St").scheduledAt(Instant.now()).status(BookingStatus.PENDING)
                .build();
        when(bookingRepository.findByIdempotencyKey(key)).thenReturn(Optional.of(existing));
        when(reviewRepository.existsByBookingId(any())).thenReturn(false);

        CreateBookingRequest req = new CreateBookingRequest(
                workerProfileId, categoryId, "123 Main St", null, null,
                Instant.now().plus(1, ChronoUnit.DAYS), null, null, key);

        BookingResponseDTO dto = bookingService.createBooking(customerId, req);
        assertThat(dto.status()).isEqualTo(BookingStatus.PENDING);
        verify(bookingRepository, never()).save(any());
    }

    // ── CONFIRM BOOKING ──────────────────────────────────────────────────────────

    @Test
    void confirmBooking_success() {
        UUID bookingId = UUID.randomUUID();
        Booking booking = pendingBookingForWorker(bookingId);
        when(bookingRepository.findById(bookingId)).thenReturn(Optional.of(booking));
        when(bookingRepository.save(any())).thenReturn(booking);
        when(reviewRepository.existsByBookingId(any())).thenReturn(false);

        BookingResponseDTO dto = bookingService.confirmBooking(workerUserId, bookingId);
        assertThat(dto.status()).isEqualTo(BookingStatus.CONFIRMED);
        verify(notificationService).sendBookingConfirmed(any());
    }

    @Test
    void confirmBooking_wrongStatus_throws() {
        UUID bookingId = UUID.randomUUID();
        Booking booking = pendingBookingForWorker(bookingId);
        booking.setStatus(BookingStatus.CONFIRMED); // already confirmed
        when(bookingRepository.findById(bookingId)).thenReturn(Optional.of(booking));

        assertThatThrownBy(() -> bookingService.confirmBooking(workerUserId, bookingId))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("CONFIRMED");
    }

    // ── START BOOKING ────────────────────────────────────────────────────────────

    @Test
    void startBooking_correctOtp_success() throws Exception {
        UUID bookingId = UUID.randomUUID();
        String otp  = "654321";
        String hash = sha256(otp);

        Booking booking = pendingBookingForWorker(bookingId);
        booking.setStatus(BookingStatus.CONFIRMED);
        booking.setOtpCode(otp);
        booking.setOtpCodeHash(hash);

        when(bookingRepository.findById(bookingId)).thenReturn(Optional.of(booking));
        when(bookingRepository.save(any())).thenReturn(booking);
        when(reviewRepository.existsByBookingId(any())).thenReturn(false);

        BookingResponseDTO dto = bookingService.startBooking(workerUserId, bookingId, otp);
        assertThat(dto.status()).isEqualTo(BookingStatus.IN_PROGRESS);
        verify(notificationService).sendBookingStarted(any());
    }

    @Test
    void startBooking_wrongOtp_throws() throws Exception {
        UUID bookingId = UUID.randomUUID();
        Booking booking = pendingBookingForWorker(bookingId);
        booking.setStatus(BookingStatus.CONFIRMED);
        booking.setOtpCode("999999");
        booking.setOtpCodeHash(sha256("999999"));

        when(bookingRepository.findById(bookingId)).thenReturn(Optional.of(booking));

        assertThatThrownBy(() -> bookingService.startBooking(workerUserId, bookingId, "111111"))
                .isInstanceOf(BusinessException.class)
                .extracting(e -> ((BusinessException) e).getStatus())
                .isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
    }

    // ── COMPLETE BOOKING ─────────────────────────────────────────────────────────

    @Test
    void completeBooking_success() {
        UUID bookingId = UUID.randomUUID();
        Booking booking = pendingBookingForWorker(bookingId);
        booking.setStatus(BookingStatus.IN_PROGRESS);
        booking.setQuotedAmount(BigDecimal.valueOf(800));

        when(bookingRepository.findById(bookingId)).thenReturn(Optional.of(booking));
        when(bookingRepository.save(any())).thenReturn(booking);
        when(earningRepository.save(any())).thenReturn(null);
        when(reviewRepository.existsByBookingId(any())).thenReturn(false);

        BookingResponseDTO dto = bookingService.completeBooking(workerUserId, bookingId);
        assertThat(dto.status()).isEqualTo(BookingStatus.COMPLETED);
        verify(earningRepository).save(any());
        verify(notificationService).sendBookingCompleted(any());
    }

    // ── CANCEL BOOKING ───────────────────────────────────────────────────────────

    @Test
    void cancelBooking_byCustomer_success() {
        UUID bookingId = UUID.randomUUID();
        Booking booking = pendingBookingForWorker(bookingId);

        when(bookingRepository.findById(bookingId)).thenReturn(Optional.of(booking));
        when(bookingRepository.save(any())).thenReturn(booking);
        when(reviewRepository.existsByBookingId(any())).thenReturn(false);

        BookingResponseDTO dto = bookingService.cancelBooking(
                customerId, bookingId, "CUSTOMER", new CancelBookingRequest("Change of plans"));

        assertThat(dto.status()).isEqualTo(BookingStatus.CANCELLED);
        verify(notificationService).sendBookingCancelled(any());
    }

    @Test
    void cancelBooking_inProgress_throws() {
        UUID bookingId = UUID.randomUUID();
        Booking booking = pendingBookingForWorker(bookingId);
        booking.setStatus(BookingStatus.IN_PROGRESS);

        when(bookingRepository.findById(bookingId)).thenReturn(Optional.of(booking));

        // Customer tries to cancel a booking that is already in progress
        assertThatThrownBy(() -> bookingService.cancelBooking(
                customerId, bookingId, "CUSTOMER", new CancelBookingRequest("oops")))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("IN_PROGRESS");
    }

    @Test
    void cancelBooking_wrongUser_throwsForbidden() {
        UUID bookingId = UUID.randomUUID();
        Booking booking = pendingBookingForWorker(bookingId);
        UUID strangerUserId = UUID.randomUUID();

        when(bookingRepository.findById(bookingId)).thenReturn(Optional.of(booking));

        assertThatThrownBy(() -> bookingService.cancelBooking(
                strangerUserId, bookingId, "CUSTOMER", new CancelBookingRequest("hm")))
                .isInstanceOf(BusinessException.class)
                .extracting(e -> ((BusinessException) e).getStatus())
                .isEqualTo(HttpStatus.FORBIDDEN);
    }

    // ── HELPERS ──────────────────────────────────────────────────────────────────

    private Booking pendingBookingForWorker(UUID bookingId) {
        return Booking.builder()
                .id(bookingId)
                .customer(customer)
                .worker(worker)
                .category(category)
                .address("123 Main St")
                .scheduledAt(Instant.now().plus(1, ChronoUnit.DAYS))
                .status(BookingStatus.PENDING)
                .build();
    }

    private static String sha256(String input) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
        return HexFormat.of().formatHex(hash);
    }
}
