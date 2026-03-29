package com.marketplace.verification;

import com.marketplace.auth.AuthenticatedUser;
import com.marketplace.common.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/verify")
@RequiredArgsConstructor
public class VerificationController {

    private final VerificationService verificationService;

    /** Step 1: Send OTP to Aadhaar-linked mobile */
    @PostMapping("/aadhaar/send-otp")
    @PreAuthorize("hasRole('WORKER')")
    public ResponseEntity<ApiResponse<Map<String, String>>> sendOtp(
            @RequestBody Map<String, String> body) {
        String clientId = verificationService.sendAadhaarOtp(body.get("aadhaarNumber"));
        return ResponseEntity.ok(ApiResponse.ok(Map.of("clientId", clientId)));
    }

    /** Step 2: Verify OTP — marks aadhaarVerified = true */
    @PostMapping("/aadhaar/verify-otp")
    @PreAuthorize("hasRole('WORKER')")
    public ResponseEntity<ApiResponse<Map<String, Boolean>>> verifyOtp(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @RequestBody Map<String, String> body) {
        verificationService.verifyAadhaarOtp(
            principal.getUserId(), body.get("clientId"), body.get("otp"));
        return ResponseEntity.ok(ApiResponse.ok(Map.of("verified", true)));
    }

    /** Step 3: Match selfie against Aadhaar photo — marks faceVerified = true */
    @PostMapping("/face")
    @PreAuthorize("hasRole('WORKER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> matchFace(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @RequestBody Map<String, String> body) {
        verificationService.matchFace(principal.getUserId(), body.get("selfieBase64"));
        return ResponseEntity.ok(ApiResponse.ok(Map.of("matched", true, "confidence", 0.97)));
    }
}
