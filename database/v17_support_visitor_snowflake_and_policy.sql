-- Support: chuyển visitor UUID cũ sang Snowflake ID và quản lý policy trong DB.
-- Mapping tạm giữ nguyên token, conversation và toàn bộ lịch sử hiện có.
SET @support_snowflake_base = (
    FLOOR(UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3)) * 1000) - 1704067200000
) * 4194304 + 4190208;

CREATE TEMPORARY TABLE support_visitor_id_mapping (
    old_id VARCHAR(36) NOT NULL PRIMARY KEY,
    new_id BIGINT NOT NULL UNIQUE
);

INSERT INTO support_visitor_id_mapping (old_id, new_id)
SELECT id, CAST(id AS UNSIGNED)
FROM anonymous_visitor
WHERE id REGEXP '^[0-9]+$';

INSERT INTO support_visitor_id_mapping (old_id, new_id)
SELECT id, @support_snowflake_base + ROW_NUMBER() OVER (ORDER BY id)
FROM anonymous_visitor
WHERE id NOT REGEXP '^[0-9]+$';

-- Tên FK có thể do Hibernate tự sinh nên phải lấy từ information_schema.
SELECT kcu.CONSTRAINT_NAME
INTO @support_visitor_fk
FROM information_schema.KEY_COLUMN_USAGE kcu
WHERE kcu.TABLE_SCHEMA = DATABASE()
  AND kcu.TABLE_NAME = 'support_conversation'
  AND kcu.COLUMN_NAME = 'visitor_id'
  AND kcu.REFERENCED_TABLE_NAME = 'anonymous_visitor'
LIMIT 1;

SET @drop_support_visitor_fk = IF(
    @support_visitor_fk IS NULL,
    'SELECT 1',
    CONCAT('ALTER TABLE support_conversation DROP FOREIGN KEY `', @support_visitor_fk, '`')
);
PREPARE support_statement FROM @drop_support_visitor_fk;
EXECUTE support_statement;
DEALLOCATE PREPARE support_statement;

ALTER TABLE support_conversation ADD COLUMN visitor_id_new BIGINT NULL;
UPDATE support_conversation conversation
JOIN support_visitor_id_mapping mapping ON mapping.old_id = conversation.visitor_id
SET conversation.visitor_id_new = mapping.new_id;

ALTER TABLE anonymous_visitor ADD COLUMN id_new BIGINT NULL;
UPDATE anonymous_visitor visitor
JOIN support_visitor_id_mapping mapping ON mapping.old_id = visitor.id
SET visitor.id_new = mapping.new_id;

ALTER TABLE support_conversation DROP INDEX idx_support_conversation_visitor_status;
ALTER TABLE support_conversation DROP COLUMN visitor_id;
ALTER TABLE support_conversation CHANGE COLUMN visitor_id_new visitor_id BIGINT NOT NULL;

ALTER TABLE anonymous_visitor DROP PRIMARY KEY;
ALTER TABLE anonymous_visitor DROP COLUMN id;
ALTER TABLE anonymous_visitor CHANGE COLUMN id_new id BIGINT NOT NULL;
ALTER TABLE anonymous_visitor ADD PRIMARY KEY (id);

ALTER TABLE support_conversation
    ADD CONSTRAINT fk_support_conversation_visitor
        FOREIGN KEY (visitor_id) REFERENCES anonymous_visitor(id),
    ADD INDEX idx_support_conversation_visitor_status (visitor_id, status);

DROP TEMPORARY TABLE support_visitor_id_mapping;

CREATE TABLE IF NOT EXISTS support_policy (
    id BIGINT NOT NULL,
    code VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    status VARCHAR(20) NOT NULL,
    created_at DATETIME NOT NULL,
    created_by BIGINT NULL,
    updated_at DATETIME NULL,
    updated_by BIGINT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_support_policy_code (code)
);

SET @support_policy_id = (
    FLOOR(UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3)) * 1000) - 1704067200000
) * 4194304 + 4190208;

INSERT INTO support_policy (id, code, title, content, status, created_at)
SELECT @support_policy_id, 'PAYMENT_REFUND', 'Chính sách thanh toán và hoàn tiền',
       'Chính sách thanh toán và hoàn tiền được áp dụng theo thông tin công bố trong quy trình mua khóa học. Nếu cần xác nhận trường hợp cụ thể, hãy kết nối tư vấn viên.',
       'ACTIVE', CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM support_policy WHERE code = 'PAYMENT_REFUND');
