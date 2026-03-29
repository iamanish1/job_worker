package com.marketplace.worker.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record WorkerListingDTO(
    UUID       id,
    String     name,
    String     profilePhoto,
    String     categoryName,
    String     city,
    String     locality,
    BigDecimal avgRating,
    Integer    totalJobs,
    Integer    yearsExperience,
    BigDecimal dailyRate,
    BigDecimal hourlyRate,
    boolean    isAvailable
) {}
