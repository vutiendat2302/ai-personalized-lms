-- Đồng bộ enum MySQL với FileUsageTypeEnum để lưu metadata tài liệu policy.
ALTER TABLE file_metadata
    MODIFY COLUMN usage_type ENUM(
        'ASSIGNMENT',
        'ASSIGNMENT_SUBMISSION',
        'AVATAR',
        'CONTRACT',
        'COURSE_LESSON',
        'LESSON_RESOURCE',
        'LESSON_VIDEO',
        'OTHER',
        'POLICY',
        'QUIZ_ATTACHMENT'
    ) NULL;
