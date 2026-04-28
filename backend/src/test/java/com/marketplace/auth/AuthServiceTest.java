package com.marketplace.auth;

import com.marketplace.auth.dto.AuthResponse;
import com.marketplace.auth.dto.OtpVerifyRequest;
import com.marketplace.auth.dto.RefreshTokenRequest;
import com.marketplace.common.exception.BusinessException;
import com.marketplace.user.User;
import com.marketplace.user.UserRepository;
import com.marketplace.worker.WorkerProfile;
import com.marketplace.worker.WorkerRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock FirebaseTokenVerifier firebaseTokenVerifier;
    @Mock JwtService            jwtService;
    @Mock UserRepository        userRepository;
    @Mock WorkerRepository      workerRepository;

    @InjectMocks AuthService authService;

    private static final String PHONE          = "+919876543210";
    private static final String FIREBASE_TOKEN = "firebase-id-token";
    private static final String ACCESS_TOKEN   = "access.token.here";
    private static final String REFRESH_TOKEN  = "refresh.token.here";

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(authService, "fallbackOtpEnabled", false);
        ReflectionTestUtils.setField(authService, "fallbackOtpCode", "98737");
    }

    private void stubJwtGeneration() {
        when(jwtService.generateAccessToken(any(), any())).thenReturn(ACCESS_TOKEN);
        when(jwtService.generateRefreshToken(any(), any())).thenReturn(REFRESH_TOKEN);
    }

    // ── NEW USER ────────────────────────────────────────────────────────────────

    @Test
    void newCustomer_isCreatedAndTokensIssued() {
        stubJwtGeneration();
        when(firebaseTokenVerifier.verifyAndGetPhone(FIREBASE_TOKEN)).thenReturn(PHONE);
        when(userRepository.findByPhone(PHONE)).thenReturn(Optional.empty());

        User saved = User.builder().id(UUID.randomUUID()).phone(PHONE).role("CUSTOMER").build();
        when(userRepository.save(any(User.class))).thenReturn(saved);

        OtpVerifyRequest req = new OtpVerifyRequest(PHONE, FIREBASE_TOKEN, null, "CUSTOMER");
        AuthResponse resp = authService.verifyOtpAndLogin(req);

        assertThat(resp.accessToken()).isEqualTo(ACCESS_TOKEN);
        assertThat(resp.refreshToken()).isEqualTo(REFRESH_TOKEN);
        assertThat(resp.user().isNewUser()).isTrue();
        verify(userRepository).save(any(User.class));
    }

    @Test
    void newWorker_workerProfileStubCreated() {
        stubJwtGeneration();
        when(firebaseTokenVerifier.verifyAndGetPhone(FIREBASE_TOKEN)).thenReturn(PHONE);
        when(userRepository.findByPhone(PHONE)).thenReturn(Optional.empty());

        UUID userId = UUID.randomUUID();
        User saved = User.builder().id(userId).phone(PHONE).role("WORKER").build();
        when(userRepository.save(any(User.class))).thenReturn(saved);
        when(workerRepository.findByUserId(userId)).thenReturn(Optional.empty());

        OtpVerifyRequest req = new OtpVerifyRequest(PHONE, FIREBASE_TOKEN, null, "WORKER");
        authService.verifyOtpAndLogin(req);

        verify(workerRepository).save(any(WorkerProfile.class));
    }

    @Test
    void existingUser_loginSucceeds_isNewUserFalse() {
        stubJwtGeneration();
        UUID userId = UUID.randomUUID();
        User existing = User.builder().id(userId).phone(PHONE).role("CUSTOMER").build();

        when(firebaseTokenVerifier.verifyAndGetPhone(FIREBASE_TOKEN)).thenReturn(PHONE);
        when(userRepository.findByPhone(PHONE)).thenReturn(Optional.of(existing));
        when(userRepository.save(any(User.class))).thenReturn(existing);

        OtpVerifyRequest req = new OtpVerifyRequest(PHONE, FIREBASE_TOKEN, null, "CUSTOMER");
        AuthResponse resp = authService.verifyOtpAndLogin(req);

        assertThat(resp.user().isNewUser()).isFalse();
    }

    // ── PHONE MISMATCH ───────────────────────────────────────────────────────────

    @Test
    void phoneMismatch_throwsUnauthorized() {
        when(firebaseTokenVerifier.verifyAndGetPhone(FIREBASE_TOKEN)).thenReturn("+919999999999");

        OtpVerifyRequest req = new OtpVerifyRequest(PHONE, FIREBASE_TOKEN, null, "CUSTOMER");

        assertThatThrownBy(() -> authService.verifyOtpAndLogin(req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("mismatch");
    }

    @Test
    void fallbackOtp_enabled_logsInWithoutFirebaseToken() {
        ReflectionTestUtils.setField(authService, "fallbackOtpEnabled", true);
        stubJwtGeneration();
        UUID userId = UUID.randomUUID();
        User existing = User.builder().id(userId).phone(PHONE).role("CUSTOMER").build();

        when(userRepository.findByPhone(PHONE)).thenReturn(Optional.of(existing));
        when(userRepository.save(any(User.class))).thenReturn(existing);

        OtpVerifyRequest req = new OtpVerifyRequest(PHONE, "", "98737", "CUSTOMER");
        AuthResponse resp = authService.verifyOtpAndLogin(req);

        assertThat(resp.accessToken()).isEqualTo(ACCESS_TOKEN);
        assertThat(resp.user().phone()).isEqualTo(PHONE);
        verifyNoInteractions(firebaseTokenVerifier);
    }

    @Test
    void fallbackOtp_disabledWithoutFirebaseToken_throwsUnauthorized() {
        OtpVerifyRequest req = new OtpVerifyRequest(PHONE, "", "98737", "CUSTOMER");

        assertThatThrownBy(() -> authService.verifyOtpAndLogin(req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Firebase ID token is required");
    }

    // ── ROLE SWITCHING ───────────────────────────────────────────────────────────

    @Test
    void existingCustomer_switchToWorker_allowed() {
        stubJwtGeneration();
        UUID userId = UUID.randomUUID();
        User existing = User.builder().id(userId).phone(PHONE).role("CUSTOMER").build();

        when(firebaseTokenVerifier.verifyAndGetPhone(FIREBASE_TOKEN)).thenReturn(PHONE);
        when(userRepository.findByPhone(PHONE)).thenReturn(Optional.of(existing));
        when(userRepository.save(any(User.class))).thenReturn(existing);
        when(workerRepository.findByUserId(userId)).thenReturn(Optional.empty());

        OtpVerifyRequest req = new OtpVerifyRequest(PHONE, FIREBASE_TOKEN, null, "WORKER");
        AuthResponse resp = authService.verifyOtpAndLogin(req);

        assertThat(resp.accessToken()).isEqualTo(ACCESS_TOKEN);
        verify(workerRepository).save(any(WorkerProfile.class));
    }

    @Test
    void escalationToAdmin_throwsForbidden() {
        UUID userId = UUID.randomUUID();
        // Bypass @Pattern validation by using the service directly — simulate a malicious caller
        User existing = User.builder().id(userId).phone(PHONE).role("CUSTOMER").build();

        when(firebaseTokenVerifier.verifyAndGetPhone(FIREBASE_TOKEN)).thenReturn(PHONE);
        when(userRepository.findByPhone(PHONE)).thenReturn(Optional.of(existing));

        // Construct request with role=ADMIN (bypassing DTO validation at this unit level)
        OtpVerifyRequest req = new OtpVerifyRequest(PHONE, FIREBASE_TOKEN, null, "ADMIN");

        assertThatThrownBy(() -> authService.verifyOtpAndLogin(req))
                .isInstanceOf(BusinessException.class)
                .extracting(e -> ((BusinessException) e).getStatus())
                .isEqualTo(HttpStatus.FORBIDDEN);
    }

    // ── TOKEN REFRESH ────────────────────────────────────────────────────────────

    @Test
    void refreshTokens_validRefreshToken_returnsNewPair() {
        stubJwtGeneration();
        UUID userId = UUID.randomUUID();
        User user = User.builder().id(userId).phone(PHONE).role("CUSTOMER").build();

        when(jwtService.isRefreshToken(REFRESH_TOKEN)).thenReturn(true);
        when(jwtService.extractUserId(REFRESH_TOKEN)).thenReturn(userId.toString());
        when(jwtService.extractRole(REFRESH_TOKEN)).thenReturn("CUSTOMER");
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        AuthResponse resp = authService.refreshTokens(new RefreshTokenRequest(REFRESH_TOKEN));

        assertThat(resp.accessToken()).isEqualTo(ACCESS_TOKEN);
        assertThat(resp.refreshToken()).isEqualTo(REFRESH_TOKEN);
    }

    @Test
    void refreshTokens_accessTokenPassed_throwsUnauthorized() {
        when(jwtService.isRefreshToken(ACCESS_TOKEN)).thenReturn(false);

        assertThatThrownBy(() -> authService.refreshTokens(new RefreshTokenRequest(ACCESS_TOKEN)))
                .isInstanceOf(BusinessException.class)
                .extracting(e -> ((BusinessException) e).getStatus())
                .isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void refreshTokens_userNotFound_throwsUnauthorized() {
        UUID userId = UUID.randomUUID();

        when(jwtService.isRefreshToken(REFRESH_TOKEN)).thenReturn(true);
        when(jwtService.extractUserId(REFRESH_TOKEN)).thenReturn(userId.toString());
        when(jwtService.extractRole(REFRESH_TOKEN)).thenReturn("CUSTOMER");
        when(userRepository.findById(userId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.refreshTokens(new RefreshTokenRequest(REFRESH_TOKEN)))
                .isInstanceOf(BusinessException.class)
                .extracting(e -> ((BusinessException) e).getStatus())
                .isEqualTo(HttpStatus.UNAUTHORIZED);
    }
}
