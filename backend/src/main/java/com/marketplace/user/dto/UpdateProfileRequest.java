package com.marketplace.user.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(
    @Size(min = 2, max = 100, message = "Name must be 2-100 characters")
    String name,

    @Email(message = "Invalid email format")
    String email,

    String profilePhoto,
    String fcmToken
) {}
