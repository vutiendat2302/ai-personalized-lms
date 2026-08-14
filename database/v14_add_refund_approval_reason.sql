ALTER TABLE approval_request
    ADD COLUMN request_reason VARCHAR(255) NULL AFTER comment;
