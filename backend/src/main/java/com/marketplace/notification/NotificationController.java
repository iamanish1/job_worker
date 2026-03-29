package com.marketplace.notification;

import com.marketplace.auth.AuthenticatedUser;
import com.marketplace.common.response.ApiResponse;
import com.marketplace.common.response.PageResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationRepository notificationRepository;

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<NotificationDTO>>> getAll(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size) {
        var result = notificationRepository.findByUserIdOrderByCreatedAtDesc(
            principal.getUserId(), PageRequest.of(page, size))
            .map(n -> new NotificationDTO(n.getId(), n.getTitle(), n.getBody(),
                                          n.getType(), n.getRefId(), n.getIsRead(),
                                          n.getCreatedAt()));
        return ResponseEntity.ok(ApiResponse.ok(new PageResponse<>(result)));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<ApiResponse<Map<String, Long>>> getUnreadCount(
            @AuthenticationPrincipal AuthenticatedUser principal) {
        long count = notificationRepository.countByUserIdAndIsReadFalse(principal.getUserId());
        return ResponseEntity.ok(ApiResponse.ok(Map.of("count", count)));
    }

    @Transactional
    @PatchMapping("/read-all")
    public ResponseEntity<ApiResponse<Void>> markAllRead(
            @AuthenticationPrincipal AuthenticatedUser principal) {
        notificationRepository.markAllReadByUserId(principal.getUserId());
        return ResponseEntity.ok(ApiResponse.ok("All notifications marked as read", null));
    }

    @Transactional
    @PatchMapping("/{id}/read")
    public ResponseEntity<ApiResponse<Void>> markRead(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID id) {
        notificationRepository.findById(id).ifPresent(n -> {
            if (n.getUser().getId().equals(principal.getUserId())) {
                n.setIsRead(true);
                notificationRepository.save(n);
            }
        });
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    public record NotificationDTO(
        UUID    id,
        String  title,
        String  body,
        String  type,
        UUID    refId,
        boolean isRead,
        java.time.Instant createdAt
    ) {}
}
