-- PayPal Sandbox checkout: giữ giá gốc VND và lưu riêng số tiền/currency gửi gateway.

ALTER TABLE payment_transaction
    ADD COLUMN paypal_request_id VARCHAR(100) NULL,
    ADD COLUMN paypal_capture_id VARCHAR(100) NULL,
    ADD COLUMN gateway_amount DECIMAL(15, 2) NULL,
    ADD COLUMN gateway_currency VARCHAR(3) NULL,
    ADD CONSTRAINT uk_payment_paypal_request_id UNIQUE (paypal_request_id),
    ADD CONSTRAINT uk_payment_paypal_capture_id UNIQUE (paypal_capture_id);
