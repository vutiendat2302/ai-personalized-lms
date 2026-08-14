ALTER TABLE quiz
    MODIFY COLUMN status VARCHAR(20) NULL;

UPDATE quiz
SET status = CASE
    WHEN status = '1' THEN 'ACTIVE'
    WHEN status = '0' OR status IS NULL OR TRIM(status) = '' THEN 'DRAFT'
    ELSE UPPER(status)
END;

ALTER TABLE quiz
    MODIFY COLUMN status VARCHAR(20) NOT NULL DEFAULT 'DRAFT';

ALTER TABLE `order`
    ADD COLUMN payment_invoice_key VARCHAR(255) NULL AFTER paid_at,
    ADD COLUMN refund_invoice_key VARCHAR(255) NULL AFTER payment_invoice_key;

CREATE INDEX idx_assignment_status_due_scope
    ON assignment (status, due_date, course_id, class_id);

CREATE INDEX idx_quiz_status_due_scope
    ON quiz (status, due_at, course_id, class_id);

CREATE INDEX idx_class_online_status_schedule_class
    ON class_online (status, scheduled_at, class_id);

-- Repair enrollment lịch sử đã mất toàn bộ package ACTIVE sau refund.
UPDATE enrollment enrollment_row
SET enrollment_row.status = 3,
    enrollment_row.completed_at = NULL,
    enrollment_row.updated_at = CURRENT_TIMESTAMP
WHERE EXISTS (
    SELECT 1 FROM enrollment_package refunded_package
    WHERE refunded_package.enrollment_id = enrollment_row.id
      AND refunded_package.status = 'REFUNDED'
)
AND NOT EXISTS (
    SELECT 1 FROM enrollment_package active_package
    WHERE active_package.enrollment_id = enrollment_row.id
      AND active_package.status = 'ACTIVE'
      AND (active_package.expires_at IS NULL OR active_package.expires_at > CURRENT_TIMESTAMP)
);

-- Gỡ học viên còn sót trong lớp của package đã refund, nhưng giữ lại nếu còn package ACTIVE khác vào cùng lớp.
UPDATE class_member member
JOIN enrollment enrollment_row ON enrollment_row.user_id = member.user_id
JOIN enrollment_package refunded_package ON refunded_package.enrollment_id = enrollment_row.id
JOIN course_package refunded_course_package
    ON refunded_course_package.id = refunded_package.course_package_id
SET member.status = 'REMOVED',
    member.left_at = COALESCE(member.left_at, CURRENT_TIMESTAMP),
    member.updated_at = CURRENT_TIMESTAMP
WHERE member.role_in_class = 'STUDENT'
  AND member.status = 'ACTIVE'
  AND refunded_package.status = 'REFUNDED'
  AND member.class_id = COALESCE(refunded_course_package.class_id, enrollment_row.class_id)
  AND NOT EXISTS (
      SELECT 1
      FROM enrollment active_enrollment
      JOIN enrollment_package active_package ON active_package.enrollment_id = active_enrollment.id
      JOIN course_package active_course_package ON active_course_package.id = active_package.course_package_id
      WHERE active_enrollment.user_id = member.user_id
        AND active_course_package.class_id = member.class_id
        AND active_package.status = 'ACTIVE'
        AND (active_package.expires_at IS NULL OR active_package.expires_at > CURRENT_TIMESTAMP)
  );

-- Đồng bộ sĩ số sau khi repair class_member.
UPDATE `class` class_row
SET class_row.current_member_count = (
    SELECT COUNT(*)
    FROM class_member active_member
    WHERE active_member.class_id = class_row.id
      AND active_member.role_in_class = 'STUDENT'
      AND active_member.status = 'ACTIVE'
);

-- Đồng bộ số người còn quyền học theo enrollment duy nhất của từng khóa học.
UPDATE course course_row
SET course_row.enrollment_count = (
    SELECT COUNT(*)
    FROM enrollment active_enrollment
    WHERE active_enrollment.course_id = course_row.id
      AND EXISTS (
          SELECT 1 FROM enrollment_package active_package
          WHERE active_package.enrollment_id = active_enrollment.id
            AND active_package.status = 'ACTIVE'
            AND (active_package.expires_at IS NULL OR active_package.expires_at > CURRENT_TIMESTAMP)
      )
);
