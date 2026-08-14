-- Link fixed student interests to fixed course categories by identifiers.

CREATE TABLE IF NOT EXISTS interest_category (
    interest_id BIGINT NOT NULL,
    category_id BIGINT NOT NULL,
    PRIMARY KEY (interest_id, category_id),
    CONSTRAINT fk_interest_category_interest
        FOREIGN KEY (interest_id) REFERENCES interest (id),
    CONSTRAINT fk_interest_category_category
        FOREIGN KEY (category_id) REFERENCES category (id),
    INDEX idx_interest_category_category_id (category_id)
);

INSERT IGNORE INTO interest_category (interest_id, category_id)
SELECT interest.id, category.id
FROM interest
JOIN (
    SELECT 'IT_PROGRAMMING' AS interest_code, 'Kỹ thuật phần mềm' AS category_name
    UNION ALL SELECT 'IT_PROGRAMMING', 'Lập trình Backend'
    UNION ALL SELECT 'IT_PROGRAMMING', 'Lập trình Frontend'
    UNION ALL SELECT 'WEB_DEVELOPMENT', 'Lập trình Web'
    UNION ALL SELECT 'WEB_DEVELOPMENT', 'Lập trình Backend'
    UNION ALL SELECT 'WEB_DEVELOPMENT', 'Lập trình Frontend'
    UNION ALL SELECT 'MOBILE_DEVELOPMENT', 'Lập trình Mobile'
    UNION ALL SELECT 'DATA_SCIENCE', 'Khoa học dữ liệu & AI'
    UNION ALL SELECT 'DATA_SCIENCE', 'Xác suất & Thống kê'
    UNION ALL SELECT 'ARTIFICIAL_INTELLIGENCE', 'Khoa học dữ liệu & AI'
    UNION ALL SELECT 'CYBER_SECURITY', 'An toàn thông tin'
    UNION ALL SELECT 'DATABASE_SYSTEM', 'Cơ sở dữ liệu'
    UNION ALL SELECT 'CLOUD_COMPUTING', 'DevOps & Cloud'
    UNION ALL SELECT 'GRAPHIC_DESIGN', 'Thiết kế đồ họa'
    UNION ALL SELECT 'UI_UX_DESIGN', 'Thiết kế UI/UX'
    UNION ALL SELECT 'VIDEO_EDITING', 'Dựng phim & Video'
    UNION ALL SELECT 'MOTION_GRAPHIC', 'Dựng phim & Video'
    UNION ALL SELECT 'BUSINESS_ADMIN', 'Kinh doanh & Khởi nghiệp'
    UNION ALL SELECT 'DIGITAL_MARKETING', 'Marketing số'
    UNION ALL SELECT 'ENTREPRENEURSHIP', 'Kinh doanh & Khởi nghiệp'
    UNION ALL SELECT 'FINANCE_INVESTMENT', 'Tài chính & Đầu tư'
    UNION ALL SELECT 'ENGLISH_LANGUAGE', 'Tiếng Anh giao tiếp'
    UNION ALL SELECT 'ENGLISH_LANGUAGE', 'Tiếng Anh luyện thi'
    UNION ALL SELECT 'JAPANESE_LANGUAGE', 'Tiếng Nhật'
    UNION ALL SELECT 'KOREAN_LANGUAGE', 'Tiếng Hàn'
    UNION ALL SELECT 'CHINESE_LANGUAGE', 'Tiếng Trung'
    UNION ALL SELECT 'MATHEMATICS', 'Toán học phổ thông'
    UNION ALL SELECT 'MATHEMATICS', 'Toán cao cấp'
    UNION ALL SELECT 'PHYSICS', 'Vật lý'
    UNION ALL SELECT 'CHEMISTRY', 'Hóa học'
    UNION ALL SELECT 'BIOLOGY', 'Sinh học'
    UNION ALL SELECT 'PUBLIC_SPEAKING', 'Kỹ năng mềm'
    UNION ALL SELECT 'SOFT_SKILLS', 'Kỹ năng mềm'
    UNION ALL SELECT 'CAREER_ORIENTATION', 'Kỹ năng mềm'
    UNION ALL SELECT 'LEADERSHIP', 'Kỹ năng mềm'
) mapping ON mapping.interest_code = interest.code
JOIN category ON category.name = mapping.category_name;
