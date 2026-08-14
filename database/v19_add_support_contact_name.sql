-- Lưu tên visitor để card hàng đợi supporter định danh bằng tên + email thay vì ticket/điện thoại.
-- Nullable để bảo toàn conversation đã tạo trước v19; request mới bắt buộc có tên và email.
ALTER TABLE support_conversation
    ADD COLUMN full_name VARCHAR(120) NULL AFTER status;
