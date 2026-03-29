package com.marketplace.storage;

import com.marketplace.auth.AuthenticatedUser;
import com.marketplace.common.exception.BusinessException;
import com.marketplace.common.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.time.Duration;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/storage")
@RequiredArgsConstructor
public class StorageController {

    private final S3Presigner s3Presigner;

    @Value("${app.aws.s3-bucket}")
    private String bucket;

    /**
     * Returns a presigned S3 PUT URL valid for 15 minutes.
     * Client uploads directly to S3 — file bytes never touch our backend.
     */
    @PostMapping("/presigned-url")
    public ResponseEntity<ApiResponse<Map<String, String>>> getPresignedUrl(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @RequestParam String fileType,     // e.g. "image/jpeg"
            @RequestParam String folder) {     // e.g. "documents" | "profiles"

        validateFolder(folder);
        validateContentType(fileType);

        String s3Key = folder + "/" + principal.getUserId() + "/" + UUID.randomUUID();

        PresignedPutObjectRequest presigned = s3Presigner.presignPutObject(r -> r
            .signatureDuration(Duration.ofMinutes(15))
            .putObjectRequest(PutObjectRequest.builder()
                .bucket(bucket)
                .key(s3Key)
                .contentType(fileType)
                .build())
        );

        return ResponseEntity.ok(ApiResponse.ok(Map.of(
            "uploadUrl", presigned.url().toString(),
            "s3Key",     s3Key
        )));
    }

    private void validateFolder(String folder) {
        if (!folder.matches("^(documents|profiles|certificates)$")) {
            throw new BusinessException("Invalid folder. Allowed: documents, profiles, certificates");
        }
    }

    private void validateContentType(String fileType) {
        if (!fileType.matches("^(image/jpeg|image/png|image/webp|application/pdf)$")) {
            throw new BusinessException("Invalid file type. Allowed: JPEG, PNG, WebP, PDF");
        }
    }
}
