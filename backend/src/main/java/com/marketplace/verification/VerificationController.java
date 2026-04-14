package com.marketplace.verification;

import com.marketplace.auth.AuthenticatedUser;
import com.marketplace.common.response.ApiResponse;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Validated
@RestController
@RequestMapping("/api/verify")
@RequiredArgsConstructor
public class VerificationController {

    private final VerificationService verificationService;

    /** Step 1: Send OTP to Aadhaar-linked mobile number */
    @PostMapping("/aadhaar/send-otp")
    @PreAuthorize("hasRole('WORKER')")
    public ResponseEntity<ApiResponse<Map<String, String>>> sendOtp(
            @RequestBody SendOtpRequest body) {
        String clientId = verificationService.sendAadhaarOtp(body.aadhaarNumber());
        return ResponseEntity.ok(ApiResponse.ok(Map.of("clientId", clientId)));
    }

    /** Step 2: Submit OTP — marks aadhaarVerified = true */
    @PostMapping("/aadhaar/verify-otp")
    @PreAuthorize("hasRole('WORKER')")
    public ResponseEntity<ApiResponse<Map<String, Boolean>>> verifyOtp(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @RequestBody VerifyOtpRequest body) {
        verificationService.verifyAadhaarOtp(
            principal.getUserId(), body.clientId(), body.otp());
        return ResponseEntity.ok(ApiResponse.ok(Map.of("aadhaarVerified", true)));
    }

    /** Step 3: Match selfie vs Aadhaar photo — marks faceVerified = true */
    @PostMapping("/face")
    @PreAuthorize("hasRole('WORKER')")
    public ResponseEntity<ApiResponse<Map<String, Boolean>>> matchFace(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @RequestBody FaceMatchRequest body) {
        verificationService.matchFace(principal.getUserId(), body.selfieBase64());
        return ResponseEntity.ok(ApiResponse.ok(Map.of("faceVerified", true)));
    }

    // ── Request DTOs ─────────────────────────────────────────────────────────

    record SendOtpRequest(
        @NotBlank(message = "Aadhaar number is required")
        @Pattern(regexp = "\\d{12}", message = "Aadhaar number must be exactly 12 digits")
        String aadhaarNumber
    ) {}

    record VerifyOtpRequest(
        @NotBlank(message = "clientId is required") String clientId,
        @NotBlank(message = "OTP is required")
        @Pattern(regexp = "\\d{6}", message = "OTP must be 6 digits")
        String otp
    ) {}

    record FaceMatchRequest(
        @NotBlank(message = "selfieBase64 is required") String selfieBase64
    ) {}
}
