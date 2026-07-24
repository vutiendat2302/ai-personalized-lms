create table role
(
    is_system   bit          not null,
    created_at  datetime(6)  not null,
    created_by  bigint       null,
    id          bigint       not null
        primary key,
    updated_at  datetime(6)  null,
    updated_by  bigint       null,
    code        varchar(30)  not null,
    name        varchar(50)  not null,
    description varchar(255) null,
    constraint UKc36say97xydpmgigg38qv5l2p
        unique (code),
    constraint idx_roles_name
        unique (name)
);

INSERT INTO ailms.role (is_system, created_at, created_by, id, updated_at, updated_by, code, name, description) VALUES (true, '2026-07-20 17:36:46.668289', null, 337543353233051648, '2026-07-20 17:36:46.668289', null, 'ADMIN', 'ADMIN', 'System Administrator');
INSERT INTO ailms.role (is_system, created_at, created_by, id, updated_at, updated_by, code, name, description) VALUES (true, '2026-07-20 11:15:17.000000', null, 354612119091679232, '2026-07-20 11:15:17.000000', null, 'HR', 'Nhân sự', 'Quản lý hồ sơ nhân viên, phòng ban và chấm công.');
INSERT INTO ailms.role (is_system, created_at, created_by, id, updated_at, updated_by, code, name, description) VALUES (true, '2026-07-20 11:15:17.000000', null, 354612119100067840, '2026-07-20 11:15:17.000000', null, 'TEACHER', 'Giảng viên', 'Phụ trách giảng dạy, xây dựng nội dung và chấm điểm khóa học.');
INSERT INTO ailms.role (is_system, created_at, created_by, id, updated_at, updated_by, code, name, description) VALUES (true, '2026-07-20 11:15:17.000000', null, 354612119104262144, '2026-07-20 11:15:17.000000', null, 'TA', 'Trợ giảng', 'Hỗ trợ giảng viên trong việc quản lý lớp học và chấm bài.');
INSERT INTO ailms.role (is_system, created_at, created_by, id, updated_at, updated_by, code, name, description) VALUES (true, '2026-07-20 11:15:17.000000', null, 354612119108456448, '2026-07-20 11:15:17.000000', null, 'STUDENT', 'Sinh viên', 'Người học, tham gia khóa học và nộp bài tập.');
