package com.marketplace.worker.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record WorkerProfileDTO(
    UUID       id,
    UUID       userId,
    String     name,
    String     phone,
    String     profilePhoto,
    /** Primary category (first selected) — kept for listing/navigation compat */
    String     categoryId,
    String     categoryName,
    /** All selected categories with per-skill experience */
    List<CategoryDTO> workerCategories,
    String     bio,
    Integer    yearsExperience,
    BigDecimal dailyRate,
    BigDecimal hourlyRate,
    String     city,
    String     locality,
    boolean    isAvailable,
    String     verificationStatus,
    BigDecimal avgRating,
    Integer    totalJobs,
    boolean    aadhaarVerified,
    boolean    faceVerified,
    List<DocumentDTO> documents
) {
    public record CategoryDTO(String categoryId, String categoryName, Integer yearsExperience) {}
    public record DocumentDTO(UUID id, String docType, String s3Key, String status) {}
}
