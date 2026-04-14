package com.marketplace.verification;

import com.marketplace.common.exception.BusinessException;
import com.marketplace.common.exception.NotFoundException;
import com.marketplace.worker.WorkerProfile;
import com.marketplace.worker.WorkerRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Real Aadhaar + face verification via Surepass KYC API.
 * Active when verification.provider=surepass.
 *
 * Flow:
 *  1. Worker enters Aadhaar → sendAadhaarOtp  → Surepass sends OTP to Aadhaar-linked phone
 *  2. Worker enters OTP     → verifyAadhaarOtp → Surepass returns identity data + Aadhaar photo
 *  3. Worker takes selfie   → matchFace        → Surepass compares selfie vs Aadhaar photo
 */
@Slf4j
@Service
@RequiredArgsConstructor
@ConditionalOnProperty(name = "verification.provider", havingValue = "surepass")
public class SurepassVerificationService implements VerificationService {

    @Value("${surepass.api.base-url:https://kyc-api.surepass.io}")
    private String baseUrl;

    @Value("${surepass.api.token}")
    private String apiToken;

    private final WorkerRepository workerRepository;

    private RestClient restClient;

    /**
     * Temporary cache: workerId → Aadhaar face photo (base64) returned by Surepass after OTP.
     * Used during face-match step. Cleared after match or on failure.
     */
    private final Map<UUID, String> aadhaarPhotoCache = new ConcurrentHashMap<>();

    @PostConstruct
    void init() {
        restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .defaultHeader("Authorization", "Bearer " + apiToken)
                .defaultHeader("Content-Type", "application/json")
                .build();
        log.info("SurepassVerificationService initialised (base={})", baseUrl);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Step 1 — Send OTP to Aadhaar-linked mobile
    // ─────────────────────────────────────────────────────────────────────────

    @Override
    public String sendAadhaarOtp(String aadhaarNumber) {
        if (aadhaarNumber == null || !aadhaarNumber.matches("\\d{12}")) {
            throw new BusinessException("Aadhaar number must be exactly 12 digits");
        }

        log.info("Sending Aadhaar OTP for aadhaar ending in ...{}", aadhaarNumber.substring(8));

        SurepassResponse resp = restClient.post()
                .uri("/api/v1/aadhaar-v2/generate-otp")
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("id_number", aadhaarNumber))
                .retrieve()
                .onStatus(HttpStatusCode::isError, (req, res) -> {
                    log.warn("Surepass generate-otp error: HTTP {}", res.getStatusCode());
                    throw new BusinessException("Aadhaar OTP service unavailable. Please try again.",
                            HttpStatus.BAD_GATEWAY);
                })
                .body(SurepassResponse.class);

        assertSuccess(resp, "Failed to send Aadhaar OTP");

        String clientId = extractString(resp.data(), "client_id");
        log.info("Aadhaar OTP sent. clientId={}", clientId);
        return clientId;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Step 2 — Verify OTP → mark aadhaarVerified
    // ─────────────────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public void verifyAadhaarOtp(UUID workerId, String clientId, String otp) {
        if (clientId == null || clientId.isBlank()) {
            throw new BusinessException("clientId is required");
        }
        if (otp == null || !otp.matches("\\d{6}")) {
            throw new BusinessException("OTP must be 6 digits");
        }

        log.info("Verifying Aadhaar OTP for workerId={}", workerId);

        SurepassResponse resp = restClient.post()
                .uri("/api/v1/aadhaar-v2/submit-otp")
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("client_id", clientId, "otp", otp))
                .retrieve()
                .onStatus(HttpStatusCode::isError, (req, res) -> {
                    log.warn("Surepass submit-otp error: HTTP {}", res.getStatusCode());
                    throw new BusinessException("OTP verification service error. Please try again.",
                            HttpStatus.BAD_GATEWAY);
                })
                .body(SurepassResponse.class);

        assertSuccess(resp, "OTP verification failed. Please check your OTP and try again.");

        // Cache the Aadhaar face photo for the subsequent face-match step
        if (resp.data() != null) {
            Object photo = resp.data().get("photo");
            if (photo instanceof String photoStr && !photoStr.isBlank()) {
                aadhaarPhotoCache.put(workerId, photoStr);
                log.debug("Aadhaar photo cached for workerId={}", workerId);
            } else {
                log.warn("Surepass did not return photo for workerId={}. Face match may not work.", workerId);
            }
        }

        WorkerProfile wp = workerRepository.findByUserId(workerId)
                .orElseThrow(() -> new NotFoundException("Worker profile not found"));
        wp.setAadhaarVerified(true);
        autoVerifyIfComplete(wp);
        workerRepository.save(wp);

        log.info("Aadhaar verified for workerId={}", workerId);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Step 3 — Match selfie vs Aadhaar photo
    // ─────────────────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public void matchFace(UUID workerId, String selfieBase64) {
        if (selfieBase64 == null || selfieBase64.isBlank()) {
            throw new BusinessException("Selfie image is required");
        }

        String aadhaarPhoto = aadhaarPhotoCache.get(workerId);
        if (aadhaarPhoto == null) {
            throw new BusinessException(
                "Aadhaar not yet verified or session expired. Please complete Aadhaar OTP verification first.",
                HttpStatus.BAD_REQUEST);
        }

        log.info("Running face-match for workerId={}", workerId);

        SurepassResponse resp = restClient.post()
                .uri("/api/v1/face-match")
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("file1", selfieBase64, "file2", aadhaarPhoto))
                .retrieve()
                .onStatus(HttpStatusCode::isError, (req, res) -> {
                    log.warn("Surepass face-match error: HTTP {}", res.getStatusCode());
                    throw new BusinessException("Face match service error. Please try again.",
                            HttpStatus.BAD_GATEWAY);
                })
                .body(SurepassResponse.class);

        assertSuccess(resp, "Face match failed");

        Object matchResult = resp.data() != null ? resp.data().get("match") : null;
        if (!Boolean.TRUE.equals(matchResult)) {
            double confidence = extractDouble(resp.data(), "confidence");
            log.warn("Face match FAILED for workerId={}, confidence={}", workerId, confidence);
            throw new BusinessException(
                "Face does not match Aadhaar photo. Please retake the selfie in good lighting.",
                HttpStatus.UNPROCESSABLE_ENTITY);
        }

        double confidence = extractDouble(resp.data(), "confidence");
        log.info("Face match PASSED for workerId={}, confidence={}", workerId, confidence);

        // Clean up cached photo
        aadhaarPhotoCache.remove(workerId);

        WorkerProfile wp = workerRepository.findByUserId(workerId)
                .orElseThrow(() -> new NotFoundException("Worker profile not found"));
        wp.setFaceVerified(true);
        autoVerifyIfComplete(wp);
        workerRepository.save(wp);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────

    private void assertSuccess(SurepassResponse resp, String fallbackMessage) {
        if (resp == null) {
            throw new BusinessException(fallbackMessage, HttpStatus.BAD_GATEWAY);
        }
        if (!Boolean.TRUE.equals(resp.success())) {
            String msg = (resp.message() != null && !resp.message().isBlank())
                    ? resp.message()
                    : fallbackMessage;
            log.warn("Surepass API returned success=false: {}", msg);
            throw new BusinessException(msg, HttpStatus.BAD_REQUEST);
        }
    }

    private String extractString(Map<String, Object> data, String key) {
        if (data == null || !data.containsKey(key)) {
            throw new BusinessException("Unexpected response from verification service",
                    HttpStatus.BAD_GATEWAY);
        }
        return data.get(key).toString();
    }

    private double extractDouble(Map<String, Object> data, String key) {
        if (data == null || !data.containsKey(key)) return 0.0;
        Object v = data.get(key);
        return v instanceof Number n ? n.doubleValue() : 0.0;
    }

    private void autoVerifyIfComplete(WorkerProfile wp) {
        if (Boolean.TRUE.equals(wp.getAadhaarVerified())
                && Boolean.TRUE.equals(wp.getFaceVerified())) {
            wp.setVerificationStatus("VERIFIED");
            log.info("Worker {} auto-verified after passing all identity checks", wp.getId());
        }
    }
}
