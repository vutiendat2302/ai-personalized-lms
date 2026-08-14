-- Bổ sung scope và feedback cho database đã tạo bảng AI ở migration v3.
ALTER TABLE ai_conversation
    ADD COLUMN IF NOT EXISTS scope VARCHAR(30) NOT NULL DEFAULT 'ADMIN_COPILOT'
    AFTER owner_id;

ALTER TABLE ai_message
    ADD COLUMN IF NOT EXISTS feedback VARCHAR(20) NULL
    AFTER content;
