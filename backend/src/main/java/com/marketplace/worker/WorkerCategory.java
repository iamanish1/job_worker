package com.marketplace.worker;

import com.marketplace.category.Category;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "worker_categories")
@Getter @Setter
@NoArgsConstructor
public class WorkerCategory {

    @EmbeddedId
    private WorkerCategoryId id = new WorkerCategoryId();

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("workerId")
    @JoinColumn(name = "worker_id")
    private WorkerProfile worker;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("categoryId")
    @JoinColumn(name = "category_id")
    private Category category;

    @Column(name = "years_experience", nullable = false)
    private Integer yearsExperience = 0;

    public WorkerCategory(WorkerProfile worker, Category category, int yearsExperience) {
        this.id              = new WorkerCategoryId(worker.getId(), category.getId());
        this.worker          = worker;
        this.category        = category;
        this.yearsExperience = yearsExperience;
    }
}
