package com.marketplace.booking.dto;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record CreateBookingRequest(
    @NotNull(message = "Worker ID is required")
    UUID workerId,

    @NotNull(message = "Category ID is required")
    UUID categoryId,

    @NotBlank(message = "Address is required")
    String address,

    BigDecimal latitude,
    BigDecimal longitude,

    @NotNull(message = "Scheduled time is required")
    @Future(message = "Scheduled time must be in the future")
    Instant scheduledAt,

    @Size(max = 500, message = "Description must be under 500 characters")
    String description,

    @DecimalMin(value = "0.0", inclusive = false, message = "Quoted amount must be positive")
    BigDecimal quotedAmount,

    /** Client-generated UUID for idempotency — prevents duplicate bookings on retry */
    String idempotencyKey
) {}
