-- Lưu thời lượng media chính xác để UI không dùng thời lượng học ước tính cho video.
ALTER TABLE lesson
    ADD COLUMN duration_sec INT NULL AFTER duration_min;

