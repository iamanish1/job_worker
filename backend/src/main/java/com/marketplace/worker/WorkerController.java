package com.marketplace.worker;

import com.marketplace.auth.AuthenticatedUser;
import com.marketplace.common.response.ApiResponse;
import com.marketplace.common.response.PageResponse;
import com.marketplace.worker.dto.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/workers")
@RequiredArgsConstructor
public class WorkerController {

    private final WorkerService workerService;

    /** Public — browse workers */
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<WorkerListingDTO>>> list(
            @RequestParam(required = false) UUID    categoryId,
            @RequestParam(required = false) String  city,
            @RequestParam(required = false) Boolean available,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.ok(
            workerService.listWorkers(categoryId, city, available, page, size)));
    }

    /** Public — view any worker profile */
    @GetMapping("/{workerId}")
    public ResponseEntity<ApiResponse<WorkerProfileDTO>> getProfile(
            @PathVariable UUID workerId) {
        return ResponseEntity.ok(ApiResponse.ok(workerService.getProfile(workerId)));
    }

    /** Worker — view own profile */
    @GetMapping("/me")
    @PreAuthorize("hasRole('WORKER')")
    public ResponseEntity<ApiResponse<WorkerProfileDTO>> getMyProfile(
            @AuthenticationPrincipal AuthenticatedUser principal) {
        return ResponseEntity.ok(ApiResponse.ok(
            workerService.getMyProfile(principal.getUserId())));
    }

    /** Worker — update own profile */
    @PutMapping("/me")
    @PreAuthorize("hasRole('WORKER')")
    public ResponseEntity<ApiResponse<WorkerProfileDTO>> updateProfile(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @Valid @RequestBody WorkerUpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(
            workerService.updateProfile(principal.getUserId(), request)));
    }

    /** Worker — toggle availability */
    @PatchMapping("/me/availability")
    @PreAuthorize("hasRole('WORKER')")
    public ResponseEntity<ApiResponse<Void>> setAvailability(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @RequestBody Map<String, Boolean> body) {
        workerService.setAvailability(principal.getUserId(),
                Boolean.TRUE.equals(body.get("available")));
        return ResponseEntity.ok(ApiResponse.ok("Availability updated", null));
    }

    /** Worker — add KYC document (s3Key from presigned upload) */
    @PostMapping("/me/documents")
    @PreAuthorize("hasRole('WORKER')")
    public ResponseEntity<ApiResponse<Void>> addDocument(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @Valid @RequestBody AddDocumentRequest request) {
        workerService.addDocument(principal.getUserId(), request);
        return ResponseEntity.ok(ApiResponse.ok("Document uploaded successfully", null));
    }
}
