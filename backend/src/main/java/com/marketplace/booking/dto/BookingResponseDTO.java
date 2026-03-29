package com.marketplace.booking.dto;

import com.marketplace.booking.BookingStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record BookingResponseDTO(
    UUID          id,
    BookingStatus status,
    String        otpCode,
    WorkerSummary worker,
    CustomerSummary customer,
    String        categoryName,
    String        address,
    String        description,
    Instant       scheduledAt,
    Instant       confirmedAt,
    Instant       startedAt,
    Instant       completedAt,
    BigDecimal    quotedAmount,
    BigDecimal    finalAmount,
    String        paymentStatus,
    boolean       reviewed,
    String        cancellationReason,
    String        cancelledBy,
    Instant       createdAt
) {
    public record WorkerSummary(UUID id, String name, String phone, String profilePhoto) {}
    public record CustomerSummary(UUID id, String name, String phone) {}
}
