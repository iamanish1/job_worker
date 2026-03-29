package com.marketplace.auth;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

import java.util.UUID;

/**
 * Injected as @AuthenticationPrincipal in controllers.
 * Carries the userId and role extracted from the JWT.
 */
@Getter
@RequiredArgsConstructor
public class AuthenticatedUser {
    private final UUID   userId;
    private final String role;
}
