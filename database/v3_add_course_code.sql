ALTER TABLE `course`
    ADD COLUMN `code` VARCHAR(30) NULL AFTER `id`;

UPDATE `course`
SET `code` = CONCAT('KH-MIG-', `id`)
WHERE `code` IS NULL OR TRIM(`code`) = '';

ALTER TABLE `course`
    MODIFY COLUMN `code` VARCHAR(30) NOT NULL,
    ADD CONSTRAINT `uk_course_code` UNIQUE (`code`);
