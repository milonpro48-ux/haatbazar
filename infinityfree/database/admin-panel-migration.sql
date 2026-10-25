CREATE TABLE IF NOT EXISTS seller_verifications (
 id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
 user_id BIGINT UNSIGNED NOT NULL UNIQUE,
 business_name VARCHAR(180) NOT NULL,
 trade_license VARCHAR(100) NOT NULL DEFAULT '',
 document_path VARCHAR(255) NOT NULL DEFAULT '',
 status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
 admin_note VARCHAR(500) NOT NULL DEFAULT '',
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 reviewed_at TIMESTAMP NULL DEFAULT NULL,
 CONSTRAINT fk_seller_verification_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
 INDEX idx_seller_verification_status(status,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
