-- Lưu lịch sử Admin Copilot bền vững và tách khỏi vector memory.
CREATE TABLE IF NOT EXISTS ai_conversation (
    id VARCHAR(64) PRIMARY KEY,
    owner_id BIGINT NOT NULL,
    scope VARCHAR(30) NOT NULL DEFAULT 'ADMIN_COPILOT',
    title VARCHAR(160) NOT NULL,
    module VARCHAR(50) NOT NULL DEFAULT 'GENERAL',
    context_route VARCHAR(255) NULL,
    last_message_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL,
    created_by BIGINT NULL,
    updated_at DATETIME NULL,
    updated_by BIGINT NULL,
    INDEX idx_ai_conversation_owner_updated (owner_id, last_message_at),
    CONSTRAINT fk_ai_conversation_owner FOREIGN KEY (owner_id) REFERENCES user(id)
        ON DELETE CASCADE
);

-- Tin nhắn được xóa theo hội thoại, không dùng làm vector memory tự động.
CREATE TABLE IF NOT EXISTS ai_message (
    id BIGINT PRIMARY KEY,
    conversation_id VARCHAR(64) NOT NULL,
    role VARCHAR(20) NOT NULL,
    content LONGTEXT NOT NULL,
    feedback VARCHAR(20) NULL,
    created_at DATETIME NOT NULL,
    created_by BIGINT NULL,
    updated_at DATETIME NULL,
    updated_by BIGINT NULL,
    INDEX idx_ai_message_conversation_created (conversation_id, created_at),
    CONSTRAINT fk_ai_message_conversation FOREIGN KEY (conversation_id)
        REFERENCES ai_conversation(id) ON DELETE CASCADE
);
