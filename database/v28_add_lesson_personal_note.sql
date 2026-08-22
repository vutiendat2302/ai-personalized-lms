-- Persist student notes per lesson and enrollment.
ALTER TABLE lesson_progress
    ADD COLUMN personal_note TEXT NULL AFTER attempt_count;
