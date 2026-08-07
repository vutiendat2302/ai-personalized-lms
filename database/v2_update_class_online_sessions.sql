ALTER TABLE `class_online`
    ADD COLUMN `code` VARCHAR(50) NULL AFTER `id`,
    ADD COLUMN `meeting_provider` VARCHAR(50) NULL DEFAULT 'GOOGLE_MEET' AFTER `meeting_url`,
    ADD COLUMN `record_url` VARCHAR(500) NULL AFTER `status`,
    ADD COLUMN `session_summary` TEXT NULL AFTER `record_url`,
    ADD COLUMN `student_feedback` TEXT NULL AFTER `session_summary`,
    ADD COLUMN `teacher_notes` TEXT NULL AFTER `student_feedback`,
    ADD COLUMN `next_session_notes` TEXT NULL AFTER `teacher_notes`;

CREATE UNIQUE INDEX `uk_class_online_code` ON `class_online` (`code`);

UPDATE `class_online`
SET `meeting_provider` = 'GOOGLE_MEET',
    `meeting_url` = 'https://meet.google.com/new'
WHERE `meeting_url` IS NULL
   OR TRIM(`meeting_url`) = '';
