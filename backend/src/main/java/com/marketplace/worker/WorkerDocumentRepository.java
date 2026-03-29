package com.marketplace.worker;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface WorkerDocumentRepository extends JpaRepository<WorkerDocument, UUID> {
    List<WorkerDocument> findByWorkerId(UUID workerId);
}
