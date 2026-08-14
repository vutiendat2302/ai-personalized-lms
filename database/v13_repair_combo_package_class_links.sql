-- Sửa các gói COMBO có thành phần lớp nhóm nhưng chưa được gắn lớp.
-- Một lớp có thể được bán qua nhiều package khác nhau; sức chứa vẫn được kiểm tra theo class_member.

UPDATE course_package cp
SET cp.class_id = (
    SELECT c.id
    FROM class c
    WHERE c.course_id = cp.course_id
      AND c.status = 'ACTIVE'
    ORDER BY COALESCE(c.registration_open, 0) DESC, c.start_date, c.id
    LIMIT 1
)
WHERE cp.delivery_mode = 'COMBO'
  AND COALESCE(cp.max_group_size, 0) > 1
  AND cp.class_id IS NULL
  AND EXISTS (
      SELECT 1
      FROM class available_class
      WHERE available_class.course_id = cp.course_id
        AND available_class.status = 'ACTIVE'
  );

-- COMBO không có lớp được chuẩn hóa thành tự học + gia sư; max_group_size không được dùng
-- để ngụ ý một lớp không tồn tại. Validation nhu cầu gia sư vẫn dựa trên số buổi 1-1.
UPDATE course_package
SET max_group_size = NULL, updated_at = CURRENT_TIMESTAMP
WHERE delivery_mode = 'COMBO'
  AND COALESCE(max_group_size, 0) > 1
  AND class_id IS NULL;
