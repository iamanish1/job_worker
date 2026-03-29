package com.marketplace.user.dto;

import java.util.UUID;

public record UserProfileDTO(
    UUID   id,
    String phone,
    String name,
    String email,
    String profilePhoto,
    String role
) {}
