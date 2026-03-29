package com.marketplace.worker;

import com.marketplace.category.Category;
import com.marketplace.common.audit.AuditableEntity;
import com.marketplace.user.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;


@Entity
@Table(name = "worker_profiles")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkerProfile extends AuditableEntity {

    @Id
    @UuidGenerator
    @Column(updatable = false, nullable = false)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    /** Primary / display category — kept for listing query compatibility */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private Category category;

    /** All selected categories with per-skill experience */
    @Builder.Default
    @OneToMany(mappedBy = "worker", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<WorkerCategory> workerCategories = new ArrayList<>();

    @Column(columnDefinition = "TEXT")
    private String bio;

    @Builder.Default
    @Column(name = "years_experience", nullable = false)
    private Integer yearsExperience = 0;

    @Column(name = "hourly_rate", precision = 10, scale = 2)
    private BigDecimal hourlyRate;

    @Column(name = "daily_rate", precision = 10, scale = 2)
    private BigDecimal dailyRate;

    @Builder.Default
    @Column(nullable = false, length = 100)
    private String city = "";

    @Column(length = 150)
    private String locality;

    @Column(precision = 9, scale = 6)
    private BigDecimal latitude;

    @Column(precision = 9, scale = 6)
    private BigDecimal longitude;

    @Builder.Default
    @Column(name = "is_available", nullable = false)
    private Boolean isAvailable = false;

    @Builder.Default
    @Column(name = "verification_status", nullable = false, length = 30)
    private String verificationStatus = "PENDING";
    // PENDING | UNDER_REVIEW | VERIFIED | REJECTED

    @Builder.Default
    @Column(name = "avg_rating", nullable = false, precision = 3, scale = 2)
    private BigDecimal avgRating = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "total_jobs", nullable = false)
    private Integer totalJobs = 0;

    @Builder.Default
    @Column(name = "aadhaar_verified", nullable = false)
    private Boolean aadhaarVerified = false;

    @Builder.Default
    @Column(name = "face_verified", nullable = false)
    private Boolean faceVerified = false;
}
