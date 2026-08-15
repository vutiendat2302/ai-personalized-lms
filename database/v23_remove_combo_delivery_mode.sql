-- Chuẩn hóa dữ liệu gói cũ trước khi backend chỉ chấp nhận ba hình thức học.
START TRANSACTION;

-- Gói cũ đã gắn lớp tiếp tục hoạt động như gói lớp nhóm.
UPDATE course_package
SET delivery_mode = 'GROUP_CLASS',
    updated_at = CURRENT_TIMESTAMP
WHERE delivery_mode = 'COMBO'
  AND class_id IS NOT NULL;

-- Gói cũ có buổi gia sư nhưng không gắn lớp tiếp tục hoạt động như gói 1-1.
UPDATE course_package
SET delivery_mode = 'ONE_ON_ONE',
    class_id = NULL,
    max_group_size = 1,
    updated_at = CURRENT_TIMESTAMP
WHERE delivery_mode = 'COMBO'
  AND COALESCE(included_tutor_sessions, 0) > 0;

-- Các gói cũ còn lại được chuẩn hóa thành gói tự học.
UPDATE course_package
SET delivery_mode = 'SELF_STUDY',
    class_id = NULL,
    included_tutor_sessions = 0,
    max_group_size = NULL,
    updated_at = CURRENT_TIMESTAMP
WHERE delivery_mode = 'COMBO';

COMMIT;
