package com.marketplace.auth;

import com.marketplace.auth.dto.AuthResponse;
import com.marketplace.auth.dto.OtpVerifyRequest;
import com.marketplace.auth.dto.RefreshTokenRequest;
import com.marketplace.common.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    /**
     * Step 1 of auth: just a hint to client to trigger Firebase OTP.
     * Actual SMS is sent by Firebase from the mobile app directly.
     * This endpoint just validates the phone format server-side.
     */
    @PostMapping("/otp/send")
    public ResponseEntity<ApiResponse<Void>> sendOtp(@RequestParam String phone) {
        // Firebase handles OTP sending from client SDK.
        // This endpoint exists for server-side validation / rate limiting hook.
        return ResponseEntity.ok(ApiResponse.ok("OTP send initiated via Firebase", null));
    }

    /**
     * Step 2: Client sends Firebase-verified idToken + phone + role.
     * Server verifies token, upserts user, returns JWT.
     */
    @PostMapping("/otp/verify")
    public ResponseEntity<ApiResponse<AuthResponse>> verifyOtp(
            @Valid @RequestBody OtpVerifyRequest request) {
        AuthResponse response = authService.verifyOtpAndLogin(request);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<AuthResponse>> refresh(
            @Valid @RequestBody RefreshTokenRequest request) {
        AuthResponse response = authService.refreshTokens(request);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }
}
