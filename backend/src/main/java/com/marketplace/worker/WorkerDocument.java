package com.marketplace.worker;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "worker_documents")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkerDocument {

    @Id
    @UuidGenerator
    @Column(updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "worker_id", nullable = false)
    private WorkerProfile worker;

    @Column(name = "doc_type", nullable = false, length = 50)
    private String docType;
    // AADHAAR_FRONT | AADHAAR_BACK | PAN | PHOTO | CERTIFICATE | OTHER

    @Column(name = "s3_key", nullable = false)
    private String s3Key;

    @Builder.Default
    @Column(nullable = false, length = 30)
    private String status = "UPLOADED";
    // UPLOADED | VERIFIED | REJECTED

    @Column(name = "rejection_note")
    private String rejectionNote;

    @Builder.Default
    @Column(name = "uploaded_at", nullable = false)
    private Instant uploadedAt = Instant.now();
}
