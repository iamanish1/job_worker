package com.marketplace.booking;

import com.marketplace.auth.AuthenticatedUser;
import com.marketplace.booking.dto.*;
import com.marketplace.common.response.ApiResponse;
import com.marketplace.common.response.PageResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/bookings")
@RequiredArgsConstructor
public class BookingController {

    private final BookingService bookingService;

    /** Customer creates a booking */
    @PostMapping
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<BookingResponseDTO>> create(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @Valid @RequestBody CreateBookingRequest request) {
        BookingResponseDTO dto = bookingService.createBooking(principal.getUserId(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(dto));
    }

    /** Get own bookings (works for both roles) */
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<BookingResponseDTO>>> getMyBookings(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size) {
        PageResponse<BookingResponseDTO> result = "WORKER".equals(principal.getRole())
            ? bookingService.getWorkerBookings(principal.getUserId(), page, size)
            : bookingService.getCustomerBookings(principal.getUserId(), page, size);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    /** Get single booking detail */
    @GetMapping("/{bookingId}")
    public ResponseEntity<ApiResponse<BookingResponseDTO>> getBooking(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID bookingId) {
        return ResponseEntity.ok(ApiResponse.ok(
            bookingService.getBooking(principal.getUserId(), bookingId, principal.getRole())));
    }

    /** Worker confirms a booking */
    @PatchMapping("/{bookingId}/confirm")
    @PreAuthorize("hasRole('WORKER')")
    public ResponseEntity<ApiResponse<BookingResponseDTO>> confirm(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID bookingId) {
        return ResponseEntity.ok(ApiResponse.ok(
            bookingService.confirmBooking(principal.getUserId(), bookingId)));
    }

    /** Worker starts job — requires customer OTP */
    @PatchMapping("/{bookingId}/start")
    @PreAuthorize("hasRole('WORKER')")
    public ResponseEntity<ApiResponse<BookingResponseDTO>> start(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID bookingId,
            @Valid @RequestBody StartBookingRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(
            bookingService.startBooking(principal.getUserId(), bookingId, request.otpCode())));
    }

    /** Worker marks job as completed */
    @PatchMapping("/{bookingId}/complete")
    @PreAuthorize("hasRole('WORKER')")
    public ResponseEntity<ApiResponse<BookingResponseDTO>> complete(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID bookingId) {
        return ResponseEntity.ok(ApiResponse.ok(
            bookingService.completeBooking(principal.getUserId(), bookingId)));
    }

    /** Either party cancels */
    @PatchMapping("/{bookingId}/cancel")
    public ResponseEntity<ApiResponse<BookingResponseDTO>> cancel(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID bookingId,
            @Valid @RequestBody CancelBookingRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(
            bookingService.cancelBooking(principal.getUserId(), bookingId,
                                         principal.getRole(), request)));
    }
}
