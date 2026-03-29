package com.marketplace.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record OtpVerifyRequest(
    @NotBlank(message = "Phone is required")
    @Pattern(regexp = "^\\+91[6-9]\\d{9}$", message = "Invalid Indian phone number (format: +91XXXXXXXXXX)")
    String phone,

    @NotBlank(message = "Firebase ID token is required")
    String firebaseIdToken,

    @NotBlank(message = "Role is required")
    @Pattern(regexp = "^(CUSTOMER|WORKER)$", message = "Role must be CUSTOMER or WORKER")
    String role
) {}
