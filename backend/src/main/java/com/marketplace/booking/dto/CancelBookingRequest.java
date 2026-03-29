package com.marketplace.booking.dto;

import jakarta.validation.constraints.Size;

public record CancelBookingRequest(
    @Size(max = 300, message = "Reason must be under 300 characters")
    String reason
) {}
