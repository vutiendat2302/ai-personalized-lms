-- Thêm phần giới thiệu công khai cho hồ sơ nhân sự/giảng viên.
ALTER TABLE employee
    ADD COLUMN bio TEXT NULL AFTER position;
