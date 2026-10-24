CREATE TABLE IF NOT EXISTS users (
 id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
 name VARCHAR(100) NOT NULL, email VARCHAR(190) NOT NULL UNIQUE, phone VARCHAR(30) NOT NULL DEFAULT '',
 password_hash VARCHAR(255) NOT NULL,
 role ENUM('buyer','seller','admin') NOT NULL DEFAULT 'buyer',
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS listings (
 id VARCHAR(80) NOT NULL PRIMARY KEY, user_id BIGINT UNSIGNED NULL,
 title VARCHAR(200) NOT NULL, category VARCHAR(100) NOT NULL, subcategory VARCHAR(100) NOT NULL DEFAULT '',
 district VARCHAR(100) NOT NULL DEFAULT '', upazila VARCHAR(100) NOT NULL DEFAULT '',
 price DECIMAL(12,2) NOT NULL, unit VARCHAR(40) NOT NULL DEFAULT 'piece', quantity DECIMAL(12,3) NOT NULL DEFAULT 0,
 negotiable TINYINT(1) NOT NULL DEFAULT 0, sellerName VARCHAR(120) NOT NULL DEFAULT '', businessName VARCHAR(180) NOT NULL DEFAULT '',
 description TEXT NOT NULL, images JSON NULL, phone VARCHAR(30) NOT NULL DEFAULT '',
 saleType ENUM('retail','wholesale','both') NOT NULL DEFAULT 'both', minOrderQuantity DECIMAL(12,3) NOT NULL DEFAULT 1,
 deliveryAvailable TINYINT(1) NOT NULL DEFAULT 0, status ENUM('active','paused','sold','removed') NOT NULL DEFAULT 'active',
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 INDEX idx_listings_status_category(status,category), INDEX idx_listings_district(district),
 CONSTRAINT fk_listings_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS orders (
 id VARCHAR(120) NOT NULL PRIMARY KEY, listing_id VARCHAR(80) NOT NULL, buyer_id BIGINT UNSIGNED NULL,
 quantity DECIMAL(12,3) NOT NULL, buyer_name VARCHAR(100) NOT NULL, buyer_phone VARCHAR(30) NOT NULL,
 buyer_email VARCHAR(190) NOT NULL DEFAULT '', address VARCHAR(500) NOT NULL, amount_bdt DECIMAL(12,2) NOT NULL DEFAULT 0,
 status ENUM('pending','confirmed','processing','shipped','delivered','cancelled') NOT NULL DEFAULT 'pending',
 payment_status ENUM('unpaid','initiated','paid','failed','cancelled') NOT NULL DEFAULT 'unpaid',
 shipping_status VARCHAR(40) NOT NULL DEFAULT 'not_requested', created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 INDEX idx_orders_buyer(buyer_id,created_at), INDEX idx_orders_status(status,created_at),
 CONSTRAINT fk_orders_listing FOREIGN KEY(listing_id) REFERENCES listings(id),
 CONSTRAINT fk_orders_buyer FOREIGN KEY(buyer_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS payment_transactions (
 id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, order_id VARCHAR(120) NOT NULL,
 provider VARCHAR(40) NOT NULL DEFAULT 'sslcommerz', tran_id VARCHAR(100) NOT NULL UNIQUE,
 validation_id VARCHAR(100) NULL, amount_bdt DECIMAL(12,2) NOT NULL,
 status ENUM('initiated','pending','paid','failed','cancelled') NOT NULL DEFAULT 'initiated',
 raw_status VARCHAR(40) NOT NULL DEFAULT '', created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 INDEX idx_payment_order(order_id), CONSTRAINT fk_payment_order FOREIGN KEY(order_id) REFERENCES orders(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
