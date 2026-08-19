-- Mở rộng loại văn bằng/chứng chỉ để catalog qualifications phản ánh đúng dữ liệu thực tế.
ALTER TABLE degree
    MODIFY COLUMN type ENUM(
        'ASSOCIATE',
        'BACHELORS',
        'ENGINEER',
        'MASTERS',
        'DOCTORATE',
        'CERTIFICATE'
    ) NOT NULL;
