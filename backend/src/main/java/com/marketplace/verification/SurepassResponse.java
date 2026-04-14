package com.marketplace.verification;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.Map;

/**
 * Common wrapper for all Surepass API responses.
 * Example:
 * {
 *   "success": true,
 *   "message": "OTP sent successfully",
 *   "status_code": 200,
 *   "data": { "client_id": "abc123", ... }
 * }
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record SurepassResponse(
    @JsonProperty("success")     Boolean success,
    @JsonProperty("message")     String message,
    @JsonProperty("status_code") Integer statusCode,
    @JsonProperty("data")        Map<String, Object> data
) {}
