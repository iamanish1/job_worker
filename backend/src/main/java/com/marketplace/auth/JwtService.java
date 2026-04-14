package com.marketplace.auth;

import com.marketplace.common.exception.BusinessException;
import io.jsonwebtoken.*;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.UUID;

@Slf4j
@Service
public class JwtService {

    private final SecretKey key;
    private final long      accessTokenExpiryMs;
    private final long      refreshTokenExpiryMs;

    public JwtService(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.access-token-expiry-ms}") long accessTokenExpiryMs,
            @Value("${app.jwt.refresh-token-expiry-ms}") long refreshTokenExpiryMs) {
        this.key                  = Keys.hmacShaKeyFor(Decoders.BASE64.decode(secret));
        this.accessTokenExpiryMs  = accessTokenExpiryMs;
        this.refreshTokenExpiryMs = refreshTokenExpiryMs;
    }

    public String generateAccessToken(UUID userId, String role) {
        return buildToken(userId.toString(), role, accessTokenExpiryMs, "access");
    }

    public String generateRefreshToken(UUID userId, String role) {
        return buildToken(userId.toString(), role, refreshTokenExpiryMs, "refresh");
    }

    private String buildToken(String subject, String role, long expiryMs, String tokenType) {
        return Jwts.builder()
                .subject(subject)
                .claim("role",      role)
                .claim("tokenType", tokenType)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + expiryMs))
                .signWith(key)
                .compact();
    }

    public Claims validateAndExtract(String token) {
        try {
            return Jwts.parser()
                    .verifyWith(key)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
        } catch (ExpiredJwtException e) {
            throw new BusinessException("Token expired", HttpStatus.UNAUTHORIZED);
        } catch (JwtException e) {
            throw new BusinessException("Invalid token", HttpStatus.UNAUTHORIZED);
        }
    }

    public String extractUserId(String token) {
        return validateAndExtract(token).getSubject();
    }

    public String extractRole(String token) {
        Object role = validateAndExtract(token).get("role");
        if (!(role instanceof String)) {
            throw new BusinessException("Token missing role claim", HttpStatus.UNAUTHORIZED);
        }
        return (String) role;
    }

    public boolean isRefreshToken(String token) {
        return "refresh".equals(validateAndExtract(token).get("tokenType"));
    }
}
