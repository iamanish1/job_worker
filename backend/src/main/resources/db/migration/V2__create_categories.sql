CREATE TABLE categories (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(100) NOT NULL,
    name_hindi  VARCHAR(100),
    icon_url    TEXT,
    is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
    sort_order  INTEGER     NOT NULL DEFAULT 0
);

-- Seed initial categories
INSERT INTO categories (name, name_hindi, sort_order) VALUES
    ('Electrician',     'इलेक्ट्रीशियन', 1),
    ('Plumber',         'प्लंबर',          2),
    ('Carpenter',       'बढ़ई',            3),
    ('Painter',         'पेंटर',           4),
    ('Cleaner',         'सफाईकर्मी',       5),
    ('AC Technician',   'एसी तकनीशियन',   6),
    ('Mason',           'राजमिस्त्री',     7),
    ('Welder',          'वेल्डर',          8);
