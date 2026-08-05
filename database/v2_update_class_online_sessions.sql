ALTER TABLE `class_online`
    ADD COLUMN `meeting_provider` VARCHAR(50) NULL DEFAULT 'GOOGLE_MEET' AFTER `meeting_url`,
    ADD COLUMN `record_url` VARCHAR(500) NULL AFTER `status`,
    ADD COLUMN `session_summary` TEXT NULL AFTER `record_url`,
    ADD COLUMN `student_feedback` TEXT NULL AFTER `session_summary`,
    ADD COLUMN `teacher_notes` TEXT NULL AFTER `student_feedback`,
    ADD COLUMN `next_session_notes` TEXT NULL AFTER `teacher_notes`;

UPDATE `class_online`
SET `meeting_provider` = 'GOOGLE_MEET',
    `meeting_url` = 'https://meet.google.com/new'
WHERE `meeting_url` IS NULL
   OR TRIM(`meeting_url`) = '';
