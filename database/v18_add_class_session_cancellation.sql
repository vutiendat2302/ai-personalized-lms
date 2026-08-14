-- Lưu vết lý do và người hủy lịch học để hiển thị lại trên lịch/bảng tin.
ALTER TABLE class_online
    ADD COLUMN cancellation_reason TEXT NULL,
    ADD COLUMN cancelled_at DATETIME NULL,
    ADD COLUMN cancelled_by_user_id BIGINT NULL;
