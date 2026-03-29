package com.marketplace.worker.dto;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record WorkerUpdateRequest(
    List<CategoryInput> categories,

    @Size(max = 1000, message = "Bio must be under 1000 characters")
    String  bio,

    @DecimalMin(value = "0.0", inclusive = false, message = "Daily rate must be positive")
    BigDecimal dailyRate,

    @DecimalMin(value = "0.0", inclusive = false, message = "Hourly rate must be positive")
    BigDecimal hourlyRate,

    @Size(max = 100) String city,
    @Size(max = 150) String locality,

    BigDecimal latitude,
    BigDecimal longitude
) {
    public record CategoryInput(UUID categoryId, Integer yearsExperience) {}
}
