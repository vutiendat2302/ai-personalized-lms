-- Lưu nhận xét giáo viên cùng đánh giá khóa học của một lượt học đã hoàn thành.
ALTER TABLE review
    ADD COLUMN teacher_id BIGINT NULL AFTER comment,
    ADD COLUMN teacher_rating INT NULL AFTER teacher_id,
    ADD COLUMN teacher_comment TEXT NULL AFTER teacher_rating;

CREATE INDEX idx_review_teacher_id ON review (teacher_id);

ALTER TABLE review
    ADD CONSTRAINT fk_review_teacher
        FOREIGN KEY (teacher_id) REFERENCES user (id)
        ON DELETE SET NULL;
