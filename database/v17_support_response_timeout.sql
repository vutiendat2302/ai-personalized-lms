-- Support chat: lưu mốc phản hồi để khóa yêu cầu đóng 5 phút và tự đóng sau 20 phút.
ALTER TABLE support_conversation
    ADD COLUMN last_hr_message_at DATETIME NULL AFTER started_at,
    ADD COLUMN last_visitor_message_at DATETIME NULL AFTER last_hr_message_at,
    ADD COLUMN close_requested_at DATETIME NULL AFTER last_visitor_message_at,
    ADD INDEX idx_support_conversation_response_timeout (status, last_hr_message_at);

-- Phiên cũ bắt đầu đếm từ tin gần nhất của từng phía nếu đã có lịch sử.
UPDATE support_conversation conversation
SET conversation.last_hr_message_at = (
        SELECT MAX(message.created_at)
        FROM support_chat_message message
        WHERE message.conversation_id = conversation.id
          AND message.sender_type = 'HR'
          AND message.message_type <> 'QUICK_REPLIES'
    ),
    conversation.last_visitor_message_at = (
        SELECT MAX(message.created_at)
        FROM support_chat_message message
        WHERE message.conversation_id = conversation.id
          AND message.sender_type = 'VISITOR'
    ),
    conversation.close_requested_at = CASE
        WHEN conversation.status = 'WAITING_CONFIRMATION' THEN COALESCE(conversation.updated_at, CURRENT_TIMESTAMP)
        ELSE NULL
    END;
