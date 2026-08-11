-- Voucher ownership, cart checkout snapshots, class assignments and quiz deadlines.

CREATE TABLE IF NOT EXISTS user_coupon (
    id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    coupon_id BIGINT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE',
    reserved_order_id BIGINT NULL,
    used_order_id BIGINT NULL,
    reserved_at DATETIME NULL,
    used_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT NULL,
    updated_at DATETIME NULL,
    updated_by BIGINT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_user_coupon_user_coupon UNIQUE (user_id, coupon_id),
    CONSTRAINT fk_user_coupon_user FOREIGN KEY (user_id) REFERENCES `user` (id),
    CONSTRAINT fk_user_coupon_coupon FOREIGN KEY (coupon_id) REFERENCES coupon (id),
    INDEX idx_user_coupon_user_status (user_id, status),
    INDEX idx_user_coupon_reserved_order (reserved_order_id),
    INDEX idx_user_coupon_used_order (used_order_id)
);

ALTER TABLE `order`
    ADD COLUMN user_coupon_id BIGINT NULL AFTER coupon_code,
    ADD INDEX idx_order_user_coupon_id (user_coupon_id),
    ADD CONSTRAINT fk_order_user_coupon FOREIGN KEY (user_coupon_id) REFERENCES user_coupon (id);

ALTER TABLE order_item
    ADD COLUMN discount_snapshot DECIMAL(15,2) NOT NULL DEFAULT 0 AFTER price_snapshot,
    ADD COLUMN final_price DECIMAL(15,2) NULL AFTER discount_snapshot;

UPDATE order_item SET final_price = price_snapshot - discount_snapshot WHERE final_price IS NULL;

ALTER TABLE order_item
    MODIFY COLUMN final_price DECIMAL(15,2) NOT NULL;

ALTER TABLE assignment
    ADD COLUMN class_id BIGINT NULL AFTER section_id,
    ADD INDEX idx_assignment_class_id (class_id),
    ADD CONSTRAINT fk_assignment_class FOREIGN KEY (class_id) REFERENCES `class` (id);

ALTER TABLE quiz
    ADD COLUMN class_id BIGINT NULL AFTER section_id,
    ADD COLUMN due_at DATETIME NULL AFTER shuffle_questions,
    ADD INDEX idx_quiz_class_due (class_id, due_at),
    ADD CONSTRAINT fk_quiz_class FOREIGN KEY (class_id) REFERENCES `class` (id);
