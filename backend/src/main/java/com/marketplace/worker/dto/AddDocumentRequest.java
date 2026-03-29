package com.marketplace.worker.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record AddDocumentRequest(
    @NotBlank
    @Pattern(regexp = "^(AADHAAR_FRONT|AADHAAR_BACK|PAN|PHOTO|CERTIFICATE|OTHER)$",
             message = "Invalid document type")
    String docType,

    @NotBlank(message = "S3 key is required")
    String s3Key
) {}
