package com.marketplace.auth;

import com.marketplace.auth.dto.AuthResponse;
import com.marketplace.auth.dto.OtpVerifyRequest;
import com.marketplace.auth.dto.RefreshTokenRequest;
import com.marketplace.common.exception.BusinessException;
import com.marketplace.user.User;
import com.marketplace.user.UserRepository;
import com.marketplace.worker.WorkerProfile;
import com.marketplace.worker.WorkerRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final FirebaseTokenVerifier firebaseTokenVerifier;
    private final JwtService            jwtService;
    private final UserRepository        userRepository;
    private final WorkerRepository      workerRepository;

    @Transactional
    public AuthResponse verifyOtpAndLogin(OtpVerifyRequest request) {
        // 1. Verify Firebase token and extract phone
        String phone = firebaseTokenVerifier.verifyAndGetPhone(request.firebaseIdToken());

        // 2. Ensure phone in request matches Firebase token
        if (!phone.equals(request.phone())) {
            throw new BusinessException("Phone number mismatch", HttpStatus.UNAUTHORIZED);
        }

        // 3. Upsert user
        Optional<User> existingUser = userRepository.findByPhone(phone);
        boolean isNewUser = existingUser.isEmpty();

        User user = existingUser.orElseGet(() -> {
            User newUser = new User();
            newUser.setPhone(phone);
            newUser.setRole(request.role());
            return newUser;
        });

        // Role switching: only allow CUSTOMER ↔ WORKER, never to ADMIN
        if (!isNewUser && !user.getRole().equals(request.role())) {
            if ("ADMIN".equals(request.role())) {
                log.warn("User {} attempted unauthorized escalation to ADMIN", phone);
                throw new BusinessException("Role escalation not permitted", HttpStatus.FORBIDDEN);
            }
            log.info("User {} switching role from {} to {}", phone, user.getRole(), request.role());
            user.setRole(request.role());
        }

        user = userRepository.save(user);

        // 4. For workers (new or role-switched), ensure worker_profile stub exists
        if ("WORKER".equals(request.role()) && workerRepository.findByUserId(user.getId()).isEmpty()) {
            WorkerProfile profile = new WorkerProfile();
            profile.setUser(user);
            workerRepository.save(profile);
        }

        // 5. Issue JWT tokens
        String accessToken  = jwtService.generateAccessToken(user.getId(), user.getRole());
        String refreshToken = jwtService.generateRefreshToken(user.getId(), user.getRole());

        return new AuthResponse(
            accessToken,
            refreshToken,
            new AuthResponse.UserInfo(user.getId(), user.getPhone(), user.getName(),
                                      user.getRole(), isNewUser)
        );
    }

    public AuthResponse refreshTokens(RefreshTokenRequest request) {
        if (!jwtService.isRefreshToken(request.refreshToken())) {
            throw new BusinessException("Not a refresh token", HttpStatus.UNAUTHORIZED);
        }
        String userId = jwtService.extractUserId(request.refreshToken());
        String role   = jwtService.extractRole(request.refreshToken());

        User user = userRepository.findById(java.util.UUID.fromString(userId))
                .orElseThrow(() -> new BusinessException("User not found", HttpStatus.UNAUTHORIZED));

        String newAccessToken  = jwtService.generateAccessToken(user.getId(), user.getRole());
        String newRefreshToken = jwtService.generateRefreshToken(user.getId(), user.getRole());

        return new AuthResponse(
            newAccessToken,
            newRefreshToken,
            new AuthResponse.UserInfo(user.getId(), user.getPhone(), user.getName(), role, false)
        );
    }
}
