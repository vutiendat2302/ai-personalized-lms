-- PayPal full refund: lưu khóa idempotent, refund ID và số tiền gateway đã hoàn.

ALTER TABLE payment_transaction
    ADD COLUMN paypal_refund_request_id VARCHAR(100) NULL,
    ADD COLUMN paypal_refund_id VARCHAR(100) NULL,
    ADD COLUMN refund_amount DECIMAL(15, 2) NULL,
    ADD COLUMN refund_currency VARCHAR(3) NULL,
    ADD COLUMN refund_reason VARCHAR(255) NULL,
    ADD COLUMN refunded_at DATETIME NULL,
    ADD CONSTRAINT uk_payment_paypal_refund_request_id UNIQUE (paypal_refund_request_id),
    ADD CONSTRAINT uk_payment_paypal_refund_id UNIQUE (paypal_refund_id),
    MODIFY COLUMN status ENUM('FAILED', 'PENDING', 'REFUNDED', 'SUCCESS') NOT NULL;
