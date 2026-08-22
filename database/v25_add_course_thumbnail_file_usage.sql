-- Đồng bộ enum MySQL với FileUsageTypeEnum để thumbnail khóa học có metadata và chủ sở hữu rõ ràng.
ALTER TABLE file_metadata
    MODIFY COLUMN usage_type ENUM(
        'ASSIGNMENT',
        'ASSIGNMENT_SUBMISSION',
        'AVATAR',
        'CONTRACT',
        'COURSE_LESSON',
        'COURSE_THUMBNAIL',
        'LESSON_RESOURCE',
        'LESSON_VIDEO',
        'OTHER',
        'POLICY',
        'QUIZ_ATTACHMENT'
    ) NULL;
