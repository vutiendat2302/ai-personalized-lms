-- Cart draft 1-1, trạng thái quyền theo package và thảo luận/hỏi đáp trong lớp.

ALTER TABLE `cart_item`
    ADD COLUMN `one_on_one_needs` TEXT NULL AFTER `course_package_id`;

ALTER TABLE `enrollment_package`
    ADD COLUMN `status` VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' AFTER `expires_at`,
    ADD INDEX `idx_enrollment_package_status_expiry` (`status`, `expires_at`);

ALTER TABLE `class_stream_post`
    ADD COLUMN `post_type` VARCHAR(20) NOT NULL DEFAULT 'DISCUSSION' AFTER `author_user_id`,
    ADD COLUMN `pinned` BOOLEAN NOT NULL DEFAULT FALSE AFTER `file_size`,
    ADD COLUMN `comment_locked` BOOLEAN NOT NULL DEFAULT FALSE AFTER `pinned`,
    ADD COLUMN `hidden` BOOLEAN NOT NULL DEFAULT FALSE AFTER `comment_locked`,
    ADD INDEX `idx_class_stream_post_feed` (`class_id`, `hidden`, `pinned`, `created_at`);

CREATE TABLE `class_stream_comment` (
    `id` BIGINT NOT NULL,
    `post_id` BIGINT NOT NULL,
    `author_user_id` BIGINT NOT NULL,
    `content` TEXT NOT NULL,
    `hidden` BOOLEAN NOT NULL DEFAULT FALSE,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `created_by` BIGINT NULL,
    `updated_at` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `updated_by` BIGINT NULL,
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_class_stream_comment_post`
        FOREIGN KEY (`post_id`) REFERENCES `class_stream_post` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_class_stream_comment_author`
        FOREIGN KEY (`author_user_id`) REFERENCES `user` (`id`),
    INDEX `idx_class_stream_comment_post` (`post_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
