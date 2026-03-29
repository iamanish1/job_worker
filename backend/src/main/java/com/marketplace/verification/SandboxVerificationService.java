package com.marketplace.verification;

import com.marketplace.common.exception.BusinessException;
import com.marketplace.common.exception.NotFoundException;
import com.marketplace.worker.WorkerProfile;
import com.marketplace.worker.WorkerRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Sandbox (mock) identity verification service.
 * Active by default (verification.provider=sandbox).
 * OTP is always "123456". Face match always succeeds.
 * Switch to a real provider (e.g. Surepass) for production.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@ConditionalOnProperty(name = "verification.provider", havingValue = "sandbox", matchIfMissing = true)
public class SandboxVerificationService implements VerificationService {

    private final WorkerRepository workerRepository;

    // In-memory session store: clientId → aadhaarNumber
    private final Map<String, String> sessions = new ConcurrentHashMap<>();

    private static final String SANDBOX_OTP = "123456";

    @Override
    public String sendAadhaarOtp(String aadhaarNumber) {
        if (aadhaarNumber == null || !aadhaarNumber.matches("\\d{12}")) {
            throw new BusinessException(
                "Aadhaar number must be exactly 12 digits", HttpStatus.BAD_REQUEST);
        }
        String clientId = UUID.randomUUID().toString();
        sessions.put(clientId, aadhaarNumber);
        log.info("[SANDBOX] Aadhaar OTP session created. clientId={}, otp={}", clientId, SANDBOX_OTP);
        return clientId;
    }

    @Override
    @Transactional
    public void verifyAadhaarOtp(UUID workerId, String clientId, String otp) {
        if (clientId == null || !sessions.containsKey(clientId)) {
            throw new BusinessException(
                "Invalid or expired session. Please request a new OTP.", HttpStatus.BAD_REQUEST);
        }
        if (!SANDBOX_OTP.equals(otp)) {
            throw new BusinessException(
                "Incorrect OTP. Hint: use 123456 in sandbox mode.", HttpStatus.BAD_REQUEST);
        }
        sessions.remove(clientId);

        WorkerProfile wp = workerRepository.findByUserId(workerId)
                .orElseThrow(() -> new NotFoundException("Worker profile not found"));
        wp.setAadhaarVerified(true);
        autoVerifyIfComplete(wp);
        workerRepository.save(wp);
        log.info("[SANDBOX] Aadhaar verified for workerId={}", workerId);
    }

    @Override
    @Transactional
    public void matchFace(UUID workerId, String selfieBase64) {
        WorkerProfile wp = workerRepository.findByUserId(workerId)
                .orElseThrow(() -> new NotFoundException("Worker profile not found"));
        wp.setFaceVerified(true);
        autoVerifyIfComplete(wp);
        workerRepository.save(wp);
        log.info("[SANDBOX] Face verified for workerId={}", workerId);
    }

    private void autoVerifyIfComplete(WorkerProfile wp) {
        if (Boolean.TRUE.equals(wp.getAadhaarVerified())
                && Boolean.TRUE.equals(wp.getFaceVerified())) {
            // Auto-approve: both identity checks passed → worker can immediately start working
            wp.setVerificationStatus("VERIFIED");
        }
    }
}
