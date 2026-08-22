-- Hoàn thiện RAG cho tài liệu lớp, context hội thoại học tập và phát hành quiz theo lớp.

ALTER TABLE `class_resource`
    ADD COLUMN `rag_status` VARCHAR(20) NOT NULL DEFAULT 'PENDING' AFTER `uploaded_by_user_id`,
    ADD COLUMN `rag_chunks_count` INT NOT NULL DEFAULT 0 AFTER `rag_status`,
    ADD COLUMN `rag_error` VARCHAR(500) NULL AFTER `rag_chunks_count`;

CREATE INDEX `idx_class_resource_rag_status`
    ON `class_resource` (`class_id`, `rag_status`);

-- Resource có trước migration chưa từng được ingest; đánh dấu FAILED để UI cho phép retry có chủ đích.
UPDATE `class_resource`
SET `rag_status` = 'FAILED',
    `rag_chunks_count` = 0,
    `rag_error` = 'Tài liệu cũ cần được đồng bộ vào kho tri thức AI.';

ALTER TABLE `quiz`
    ADD COLUMN `source_quiz_id` BIGINT NULL AFTER `class_id`,
    ADD COLUMN `available_from` DATETIME NULL AFTER `shuffle_questions`,
    ADD COLUMN `show_result_after_submit` BOOLEAN NOT NULL DEFAULT TRUE AFTER `available_from`;

CREATE INDEX `idx_quiz_class_status_available`
    ON `quiz` (`class_id`, `status`, `available_from`, `due_at`);

CREATE INDEX `idx_quiz_source_quiz_id`
    ON `quiz` (`source_quiz_id`);

ALTER TABLE `quiz`
    ADD CONSTRAINT `fk_quiz_source_quiz`
        FOREIGN KEY (`source_quiz_id`) REFERENCES `quiz` (`id`) ON DELETE SET NULL;

ALTER TABLE `ai_conversation`
    ADD COLUMN `course_id` BIGINT NULL AFTER `context_route`,
    ADD COLUMN `class_id` BIGINT NULL AFTER `course_id`,
    ADD COLUMN `lesson_id` BIGINT NULL AFTER `class_id`,
    ADD COLUMN `retrieval_scope` VARCHAR(30) NULL AFTER `lesson_id`;

CREATE INDEX `idx_ai_conversation_learning_context`
    ON `ai_conversation` (`owner_id`, `course_id`, `class_id`, `lesson_id`);
