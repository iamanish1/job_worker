package com.marketplace.review.dto;

import jakarta.validation.constraints.*;

import java.util.UUID;

public record CreateReviewRequest(
    @NotNull UUID bookingId,

    @NotNull @Min(1) @Max(5)
    Integer rating,

    @Size(max = 500)
    String comment
) {}
