package com.marketplace.auth.dto;

import java.util.UUID;

public record AuthResponse(
    String  accessToken,
    String  refreshToken,
    UserInfo user
) {
    public record UserInfo(
        UUID    id,
        String  phone,
        String  name,
        String  role,
        boolean isNewUser
    ) {}
}
