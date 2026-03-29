package com.marketplace.user;

import com.marketplace.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.util.UUID;

@Entity
@Table(name = "users")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User extends AuditableEntity {

    @Id
    @UuidGenerator
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(nullable = false, unique = true, length = 15)
    private String phone;

    @Column(length = 100)
    private String name;

    @Column(unique = true, length = 150)
    private String email;

    @Column(name = "profile_photo")
    private String profilePhoto;

    @Builder.Default
    @Column(nullable = false, length = 20)
    private String role = "CUSTOMER";  // CUSTOMER | WORKER | ADMIN

    @Builder.Default
    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @Column(name = "fcm_token")
    private String fcmToken;
}
