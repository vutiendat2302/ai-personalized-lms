-- Migration SQL Script: Create class_stream_post and class_resource tables with performance indexes

CREATE TABLE IF NOT EXISTS `class_stream_post` (
    `id` BIGINT PRIMARY KEY,
    `class_id` BIGINT NOT NULL,
    `author_user_id` BIGINT NOT NULL,
    `title` VARCHAR(255) NULL,
    `content` TEXT NOT NULL,
    `file_key` VARCHAR(255) NULL,
    `file_name` VARCHAR(255) NULL,
    `file_type` VARCHAR(100) NULL,
    `file_size` BIGINT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `created_by` BIGINT NULL,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `updated_by` BIGINT NULL,
    CONSTRAINT `fk_stream_post_class` FOREIGN KEY (`class_id`) REFERENCES `class` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `class_resource` (
    `id` BIGINT PRIMARY KEY,
    `class_id` BIGINT NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `file_key` VARCHAR(255) NOT NULL,
    `file_name` VARCHAR(255) NULL,
    `file_type` VARCHAR(100) NULL,
    `file_size` BIGINT NULL,
    `uploaded_by_user_id` BIGINT NOT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `created_by` BIGINT NULL,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `updated_by` BIGINT NULL,
    CONSTRAINT `fk_class_resource_class` FOREIGN KEY (`class_id`) REFERENCES `class` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Performance Indexes
CREATE INDEX `idx_class_stream_post_class_id` ON `class_stream_post` (`class_id`, `created_at` DESC);
CREATE INDEX `idx_class_resource_class_id` ON `class_resource` (`class_id`, `created_at` DESC);
CREATE INDEX `idx_class_online_class_id_scheduled_at` ON `class_online` (`class_id`, `scheduled_at`);
CREATE INDEX `idx_class_member_class_id_status_role` ON `class_member` (`class_id`, `status`, `role_in_class`);
