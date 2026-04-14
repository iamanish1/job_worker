package com.marketplace.booking;

import com.marketplace.booking.dto.*;
import com.marketplace.category.Category;
import com.marketplace.category.CategoryRepository;
import com.marketplace.common.exception.BusinessException;
import com.marketplace.common.exception.NotFoundException;
import com.marketplace.common.response.PageResponse;
import com.marketplace.earnings.Earning;
import com.marketplace.earnings.EarningRepository;
import com.marketplace.notification.NotificationService;
import com.marketplace.review.ReviewRepository;
import com.marketplace.user.User;
import com.marketplace.user.UserService;
import com.marketplace.worker.WorkerProfile;
import com.marketplace.worker.WorkerRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class BookingService {

    private final BookingRepository    bookingRepository;
    private final WorkerRepository     workerRepository;
    private final CategoryRepository   categoryRepository;
    private final EarningRepository    earningRepository;
    private final NotificationService  notificationService;
    private final ReviewRepository     reviewRepository;
    private final UserService          userService;

    @Transactional
    public BookingResponseDTO createBooking(UUID customerId, CreateBookingRequest request) {
        // 1. Idempotency check
        if (request.idempotencyKey() != null) {
            var existing = bookingRepository.findByIdempotencyKey(request.idempotencyKey());
            if (existing.isPresent()) {
                return toDTO(existing.get(), null);
            }
        }

        // 2. Validate worker
        WorkerProfile worker = workerRepository.findById(request.workerId())
                .orElseThrow(() -> new NotFoundException("Worker", request.workerId()));
        if (!"VERIFIED".equals(worker.getVerificationStatus())) {
            throw new BusinessException("Worker is not verified");
        }
        if (!worker.getIsAvailable()) {
            throw new BusinessException("Worker is not available");
        }

        // 3. Conflict check: 2h window around scheduled time
        Instant windowStart = request.scheduledAt().minus(2, ChronoUnit.HOURS);
        Instant windowEnd   = request.scheduledAt().plus(2, ChronoUnit.HOURS);
        if (bookingRepository.hasConflict(worker.getId(),
                List.of(BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS),
                windowStart, windowEnd)) {
            throw new BusinessException("Worker already has a booking around this time",
                    HttpStatus.CONFLICT);
        }

        // 4. Validate category
        Category category = categoryRepository.findById(request.categoryId())
                .orElseThrow(() -> new NotFoundException("Category", request.categoryId()));

        // 5. Get customer
        User customer = userService.getById(customerId);

        // 6. Generate OTP
        String otp     = generateOtp();
        String otpHash = hashOtp(otp);

        // 7. Create booking
        Booking booking = Booking.builder()
                .customer(customer)
                .worker(worker)
                .category(category)
                .address(request.address())
                .latitude(request.latitude())
                .longitude(request.longitude())
                .scheduledAt(request.scheduledAt())
                .description(request.description())
                .quotedAmount(request.quotedAmount())
                .otpCodeHash(otpHash)
                .otpCode(otp)
                .idempotencyKey(request.idempotencyKey())
                .status(BookingStatus.PENDING)
                .build();

        booking = bookingRepository.save(booking);

        // 8. Notify worker
        notificationService.sendBookingRequest(booking);

        log.info("Booking {} created for worker {}", booking.getId(), worker.getId());
        return toDTO(booking, otp);  // OTP returned only on creation
    }

    @Transactional
    public BookingResponseDTO confirmBooking(UUID workerId, UUID bookingId) {
        Booking booking = getBookingForWorker(bookingId, workerId);
        assertStatus(booking, BookingStatus.PENDING);

        booking.setStatus(BookingStatus.CONFIRMED);
        booking.setConfirmedAt(Instant.now());
        bookingRepository.save(booking);

        notificationService.sendBookingConfirmed(booking);
        return toDTO(booking, null);
    }

    @Transactional
    public BookingResponseDTO startBooking(UUID workerId, UUID bookingId, String otpCode) {
        Booking booking = getBookingForWorker(bookingId, workerId);
        assertStatus(booking, BookingStatus.CONFIRMED);

        // Validate OTP
        if (!hashOtp(otpCode).equals(booking.getOtpCodeHash())) {
            throw new BusinessException("Invalid OTP code", HttpStatus.UNPROCESSABLE_ENTITY);
        }

        booking.setStatus(BookingStatus.IN_PROGRESS);
        booking.setStartedAt(Instant.now());
        booking.setOtpCodeHash(null);  // Clear after use
        booking.setOtpCode(null);
        bookingRepository.save(booking);

        notificationService.sendBookingStarted(booking);
        return toDTO(booking, null);
    }

    @Transactional
    public BookingResponseDTO completeBooking(UUID workerId, UUID bookingId) {
        Booking booking = getBookingForWorker(bookingId, workerId);
        assertStatus(booking, BookingStatus.IN_PROGRESS);

        booking.setStatus(BookingStatus.COMPLETED);
        booking.setCompletedAt(Instant.now());
        booking.setFinalAmount(resolveFinalAmount(booking));
        bookingRepository.save(booking);

        // Create earning record
        createEarning(booking);

        // Update worker stats
        WorkerProfile worker = booking.getWorker();
        worker.setTotalJobs(worker.getTotalJobs() + 1);
        workerRepository.save(worker);

        notificationService.sendBookingCompleted(booking);
        return toDTO(booking, null);
    }

    @Transactional
    public BookingResponseDTO cancelBooking(UUID userId, UUID bookingId,
                                            String role, CancelBookingRequest request) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new NotFoundException("Booking", bookingId));

        // Verify ownership
        boolean isCustomer = "CUSTOMER".equals(role) &&
                             booking.getCustomer().getId().equals(userId);
        boolean isWorker   = "WORKER".equals(role) &&
                             booking.getWorker().getUser().getId().equals(userId);
        if (!isCustomer && !isWorker) {
            throw new BusinessException("Not authorized to cancel this booking",
                    HttpStatus.FORBIDDEN);
        }

        // Only PENDING or CONFIRMED can be cancelled
        if (booking.getStatus() != BookingStatus.PENDING &&
            booking.getStatus() != BookingStatus.CONFIRMED) {
            throw new BusinessException("Booking in status " + booking.getStatus() +
                    " cannot be cancelled");
        }

        booking.setStatus(BookingStatus.CANCELLED);
        booking.setCancelledAt(Instant.now());
        booking.setCancelledBy(role);
        booking.setCancellationReason(request.reason());
        booking.setOtpCode(null);
        booking.setOtpCodeHash(null);
        bookingRepository.save(booking);

        notificationService.sendBookingCancelled(booking);
        return toDTO(booking, null, isCustomer);
    }

    @Transactional(readOnly = true)
    public BookingResponseDTO getBooking(UUID userId, UUID bookingId, String role) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new NotFoundException("Booking", bookingId));

        boolean isCustomer = booking.getCustomer().getId().equals(userId);
        boolean isWorker   = booking.getWorker().getUser().getId().equals(userId);
        if (!isCustomer && !isWorker) {
            throw new BusinessException("Not authorized", HttpStatus.FORBIDDEN);
        }
        return toDTO(booking, null, isCustomer);
    }

    @Transactional(readOnly = true)
    public PageResponse<BookingResponseDTO> getCustomerBookings(
            UUID customerId, int page, int size) {
        return new PageResponse<>(
            bookingRepository.findByCustomerIdOrderByCreatedAtDesc(
                customerId, PageRequest.of(page, size))
                .map(b -> toDTO(b, null, true))
        );
    }

    @Transactional(readOnly = true)
    public PageResponse<BookingResponseDTO> getWorkerBookings(
            UUID userId, int page, int size) {
        WorkerProfile wp = workerRepository.findByUserId(userId)
                .orElseThrow(() -> new NotFoundException("Worker profile not found"));
        return new PageResponse<>(
            bookingRepository.findByWorkerIdOrderByCreatedAtDesc(
                wp.getId(), PageRequest.of(page, size))
                .map(b -> toDTO(b, null, false))
        );
    }

    // --- Helpers ---

    private Booking getBookingForWorker(UUID bookingId, UUID userId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new NotFoundException("Booking", bookingId));
        if (!booking.getWorker().getUser().getId().equals(userId)) {
            throw new BusinessException("Not your booking", HttpStatus.FORBIDDEN);
        }
        return booking;
    }

    private void assertStatus(Booking booking, BookingStatus expected) {
        if (booking.getStatus() != expected) {
            throw new BusinessException(
                "Booking must be in status " + expected + " but is " + booking.getStatus());
        }
    }

    private void createEarning(Booking booking) {
        BigDecimal gross    = booking.getFinalAmount() != null ? booking.getFinalAmount() : resolveFinalAmount(booking);
        BigDecimal fee      = BigDecimal.ZERO;  // 0% platform fee for MVP
        BigDecimal net      = gross.subtract(fee).setScale(2, RoundingMode.HALF_UP);

        Earning earning = Earning.builder()
                .worker(booking.getWorker())
                .booking(booking)
                .grossAmount(gross)
                .platformFee(fee)
                .netAmount(net)
                .status("SETTLED")
                .settledAt(Instant.now())
                .build();
        earningRepository.save(earning);
    }

    private BigDecimal resolveFinalAmount(Booking booking) {
        if (booking.getQuotedAmount() != null && booking.getQuotedAmount().compareTo(BigDecimal.ZERO) > 0) {
            return booking.getQuotedAmount();
        }
        if (booking.getWorker().getDailyRate() != null && booking.getWorker().getDailyRate().compareTo(BigDecimal.ZERO) > 0) {
            return booking.getWorker().getDailyRate();
        }
        if (booking.getWorker().getHourlyRate() != null && booking.getWorker().getHourlyRate().compareTo(BigDecimal.ZERO) > 0) {
            return booking.getWorker().getHourlyRate();
        }
        return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
    }

    private String generateOtp() {
        return String.format("%06d", new java.security.SecureRandom().nextInt(1000000));
    }

    private String hashOtp(String otp) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(otp.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 not available", e);
        }
    }

    BookingResponseDTO toDTO(Booking b, String plainOtp) {
        return toDTO(b, plainOtp, false);
    }

    BookingResponseDTO toDTO(Booking b, String plainOtp, boolean includeStoredOtp) {
        String otpToReturn = plainOtp != null
            ? plainOtp
            : includeStoredOtp && shouldExposeStoredOtp(b) ? b.getOtpCode() : null;

        return new BookingResponseDTO(
            b.getId(),
            b.getStatus(),
            otpToReturn,
            new BookingResponseDTO.WorkerSummary(
                b.getWorker().getId(),
                b.getWorker().getUser().getName(),
                b.getWorker().getUser().getPhone(),
                b.getWorker().getUser().getProfilePhoto()
            ),
            new BookingResponseDTO.CustomerSummary(
                b.getCustomer().getId(),
                b.getCustomer().getName(),
                b.getCustomer().getPhone()
            ),
            b.getCategory().getName(),
            b.getAddress(),
            b.getDescription(),
            b.getScheduledAt(),
            b.getConfirmedAt(),
            b.getStartedAt(),
            b.getCompletedAt(),
            b.getQuotedAmount(),
            b.getFinalAmount(),
            b.getPaymentStatus(),
            reviewRepository.existsByBookingId(b.getId()),
            b.getCancellationReason(),
            b.getCancelledBy(),
            b.getCreatedAt()
        );
    }

    private boolean shouldExposeStoredOtp(Booking booking) {
        return booking.getOtpCode() != null &&
            (booking.getStatus() == BookingStatus.PENDING ||
             booking.getStatus() == BookingStatus.CONFIRMED);
    }
}
