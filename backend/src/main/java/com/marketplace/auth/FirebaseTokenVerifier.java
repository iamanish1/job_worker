package com.marketplace.auth;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseToken;
import com.marketplace.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class FirebaseTokenVerifier {

    /**
     * Verifies the Firebase ID token issued after phone OTP verification.
     * Returns the phone number from the verified token.
     */
    // E.164: + followed by 7–15 digits
    private static final java.util.regex.Pattern E164 =
            java.util.regex.Pattern.compile("^\\+[1-9]\\d{6,14}$");

    public String verifyAndGetPhone(String idToken) {
        try {
            FirebaseToken decoded = FirebaseAuth.getInstance().verifyIdToken(idToken);
            String phone = (String) decoded.getClaims().get("phone_number");
            if (phone == null || phone.isBlank()) {
                throw new BusinessException("Firebase token has no phone_number claim",
                        HttpStatus.UNAUTHORIZED);
            }
            if (!E164.matcher(phone).matches()) {
                log.warn("Firebase token contained non-E.164 phone: {}", phone);
                throw new BusinessException("Invalid phone number format in token",
                        HttpStatus.UNAUTHORIZED);
            }
            return phone;
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Firebase token verification failed: {}", e.getMessage());
            throw new BusinessException("Invalid Firebase token", HttpStatus.UNAUTHORIZED);
        }
    }
}
