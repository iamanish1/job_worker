package com.marketplace.verification;

import java.util.UUID;

public interface VerificationService {
    /**
     * Sends an OTP to the mobile number linked to the given Aadhaar.
     * Returns a clientId that must be passed back when verifying the OTP.
     */
    String sendAadhaarOtp(String aadhaarNumber);

    /**
     * Verifies the OTP and marks aadhaarVerified = true on the worker profile.
     * Throws BusinessException on invalid OTP or expired session.
     */
    void verifyAadhaarOtp(UUID workerId, String clientId, String otp);

    /**
     * Matches the provided selfie (base64) against the Aadhaar photo.
     * Marks faceVerified = true on success.
     * Moves verificationStatus → UNDER_REVIEW when both flags are set.
     */
    void matchFace(UUID workerId, String selfieBase64);
}
