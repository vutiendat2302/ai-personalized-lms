-- Public Guided Chat: visitor session, support conversation, messages and HR presence.
-- Token gốc chỉ trả cho client; database chỉ lưu SHA-256 hash.
CREATE TABLE IF NOT EXISTS anonymous_visitor (
    id VARCHAR(36) NOT NULL,
    visitor_token_hash VARCHAR(64) NOT NULL,
    first_seen_at DATETIME NOT NULL,
    last_seen_at DATETIME NOT NULL,
    status VARCHAR(20) NOT NULL,
    created_at DATETIME NOT NULL,
    created_by BIGINT NULL,
    updated_at DATETIME NULL,
    updated_by BIGINT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_anonymous_visitor_token_hash (visitor_token_hash),
    KEY idx_anonymous_visitor_last_seen (last_seen_at)
);

CREATE TABLE IF NOT EXISTS support_conversation (
    id BIGINT NOT NULL,
    visitor_id VARCHAR(36) NOT NULL,
    assigned_hr_id BIGINT NULL,
    status VARCHAR(30) NOT NULL,
    phone VARCHAR(30) NULL,
    email VARCHAR(255) NULL,
    guided_context JSON NULL,
    queue_position INT NULL,
    estimated_wait_minutes INT NULL,
    close_reason VARCHAR(100) NULL,
    started_at DATETIME NULL,
    ended_at DATETIME NULL,
    version BIGINT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL,
    created_by BIGINT NULL,
    updated_at DATETIME NULL,
    updated_by BIGINT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_support_conversation_visitor FOREIGN KEY (visitor_id) REFERENCES anonymous_visitor(id),
    CONSTRAINT fk_support_conversation_hr FOREIGN KEY (assigned_hr_id) REFERENCES user(id),
    KEY idx_support_conversation_visitor_status (visitor_id, status),
    KEY idx_support_conversation_queue (status, created_at),
    KEY idx_support_conversation_hr_status (assigned_hr_id, status)
);

CREATE TABLE IF NOT EXISTS support_chat_message (
    id BIGINT NOT NULL,
    conversation_id BIGINT NOT NULL,
    sender_type VARCHAR(20) NOT NULL,
    message_type VARCHAR(30) NOT NULL,
    content TEXT NOT NULL,
    metadata JSON NULL,
    read_at DATETIME NULL,
    created_at DATETIME NOT NULL,
    created_by BIGINT NULL,
    updated_at DATETIME NULL,
    updated_by BIGINT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_support_message_conversation FOREIGN KEY (conversation_id) REFERENCES support_conversation(id),
    KEY idx_support_message_conversation_created (conversation_id, created_at)
);

CREATE TABLE IF NOT EXISTS support_hr_presence (
    hr_id BIGINT NOT NULL,
    status VARCHAR(30) NOT NULL,
    last_heartbeat_at DATETIME NOT NULL,
    PRIMARY KEY (hr_id),
    CONSTRAINT fk_support_presence_hr FOREIGN KEY (hr_id) REFERENCES user(id),
    KEY idx_support_presence_status_heartbeat (status, last_heartbeat_at)
);
