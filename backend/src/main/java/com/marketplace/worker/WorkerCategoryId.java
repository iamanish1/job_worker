package com.marketplace.worker;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;

@Embeddable
public class WorkerCategoryId implements Serializable {

    @Column(name = "worker_id")
    private UUID workerId;

    @Column(name = "category_id")
    private UUID categoryId;

    public WorkerCategoryId() {}

    public WorkerCategoryId(UUID workerId, UUID categoryId) {
        this.workerId   = workerId;
        this.categoryId = categoryId;
    }

    public UUID getWorkerId()   { return workerId; }
    public UUID getCategoryId() { return categoryId; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof WorkerCategoryId that)) return false;
        return Objects.equals(workerId, that.workerId)
            && Objects.equals(categoryId, that.categoryId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(workerId, categoryId);
    }
}
