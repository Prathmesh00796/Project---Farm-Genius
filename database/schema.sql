-- Farm Genius — MySQL-compatible schema (also used as reference for SQLite)
-- Maharashtra marketplace & auth

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(512) NOT NULL,
    role ENUM('farmer', 'dealer') NOT NULL DEFAULT 'farmer',
    full_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(32),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS crop_listings (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    farmer_id INTEGER NOT NULL,
    crop_name VARCHAR(64) NOT NULL,
    quantity_kg DECIMAL(12, 2) NOT NULL,
    price_per_kg DECIMAL(12, 2) NOT NULL,
    village_or_town VARCHAR(255),
    district VARCHAR(128),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (farmer_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS deal_requests (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    listing_id INTEGER NOT NULL,
    dealer_id INTEGER NOT NULL,
    status ENUM('accepted') NOT NULL DEFAULT 'accepted',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(listing_id, dealer_id),
    FOREIGN KEY (listing_id) REFERENCES crop_listings(id),
    FOREIGN KEY (dealer_id) REFERENCES users(id)
);


show DATABASES

use farm_genius

show TABLES



select * from users;