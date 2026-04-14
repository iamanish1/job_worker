package com.marketplace.common.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;

import jakarta.annotation.PostConstruct;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

@Slf4j
@Configuration
public class FirebaseConfig {

    /** File path (dev/docker): loaded from classpath */
    @Value("${app.firebase.credentials-path:}")
    private String credentialsPath;

    /**
     * Full JSON string (production): set FIREBASE_CREDENTIALS_JSON env var
     * with the entire service-account JSON as a single-line string.
     */
    @Value("${FIREBASE_CREDENTIALS_JSON:}")
    private String credentialsJson;

    @PostConstruct
    public void initialize() {
        if (!FirebaseApp.getApps().isEmpty()) return;

        try {
            InputStream stream = resolveCredentials();
            if (stream == null) {
                log.warn("Firebase credentials not configured. Phone auth will not work. " +
                         "Set FIREBASE_CREDENTIALS_JSON env var (prod) or " +
                         "add firebase-service-account.json to resources (dev).");
                return;
            }
            FirebaseOptions options = FirebaseOptions.builder()
                    .setCredentials(GoogleCredentials.fromStream(stream))
                    .build();
            FirebaseApp.initializeApp(options);
            log.info("Firebase initialized successfully");
        } catch (IOException e) {
            log.error("Failed to initialize Firebase: {}", e.getMessage());
        }
    }

    private InputStream resolveCredentials() throws IOException {
        // 1. Production: JSON string in env var (Railway / any cloud)
        if (credentialsJson != null && !credentialsJson.isBlank()) {
            log.info("Loading Firebase credentials from environment variable");
            return new ByteArrayInputStream(credentialsJson.getBytes(StandardCharsets.UTF_8));
        }
        // 2. Dev/Docker: JSON file on classpath
        if (credentialsPath != null && !credentialsPath.isBlank()) {
            var resource = new ClassPathResource(credentialsPath);
            if (resource.exists()) {
                log.info("Loading Firebase credentials from file: {}", credentialsPath);
                return resource.getInputStream();
            }
        }
        return null;
    }
}
