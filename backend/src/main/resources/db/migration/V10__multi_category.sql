-- Junction table for worker multi-category support
CREATE TABLE worker_categories (
    worker_id   UUID NOT NULL REFERENCES worker_profiles(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id),
    PRIMARY KEY (worker_id, category_id)
);

CREATE INDEX idx_worker_categories_worker_id   ON worker_categories(worker_id);
CREATE INDEX idx_worker_categories_category_id ON worker_categories(category_id);
