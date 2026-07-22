create table department
(
    created_at  datetime(6)                                                                                    not null,
    created_by  bigint                                                                                         null,
    id          bigint                                                                                         not null
        primary key,
    updated_at  datetime(6)                                                                                    null,
    updated_by  bigint                                                                                         null,
    code        varchar(50)                                                                                    not null,
    description text                                                                                           null,
    name        varchar(255)                                                                                   not null,
    status      enum ('ACTIVE', 'DELETE', 'DRAFT', 'EXPIRED', 'INACTIVE', 'PENDING', 'REJECTED', 'UNASSIGNED') null,
    constraint uk_department_code
        unique (code)
);

INSERT INTO ailms.department (created_at, created_by, id, updated_at, updated_by, code, description, name, status) VALUES ('2026-07-20 11:15:17.000000', null, 354612119041347584, '2026-07-20 11:15:17.000000', null, 'ACADEMIC', 'Quản lý chương trình đào tạo, kế hoạch giảng dạy và học vụ.', 'Phòng Đào tạo', 'ACTIVE');
INSERT INTO ailms.department (created_at, created_by, id, updated_at, updated_by, code, description, name, status) VALUES ('2026-07-20 11:15:17.000000', null, 354612119045541888, '2026-07-20 11:15:17.000000', null, 'IT', 'Quản trị hệ thống, hạ tầng CNTT và hỗ trợ kỹ thuật.', 'Phòng Công nghệ thông tin', 'ACTIVE');
INSERT INTO ailms.department (created_at, created_by, id, updated_at, updated_by, code, description, name, status) VALUES ('2026-07-20 11:15:17.000000', null, 354612119053930496, '2026-07-20 11:15:17.000000', null, 'HR', 'Quản lý tuyển dụng, hồ sơ nhân sự và chính sách nhân viên.', 'Phòng Nhân sự', 'ACTIVE');
INSERT INTO ailms.department (created_at, created_by, id, updated_at, updated_by, code, description, name, status) VALUES ('2026-07-20 11:15:17.000000', null, 354612119058124800, '2026-07-20 11:15:17.000000', null, 'FINANCE', 'Quản lý học phí, lương và các khoản thu chi.', 'Phòng Tài chính - Kế toán', 'ACTIVE');
INSERT INTO ailms.department (created_at, created_by, id, updated_at, updated_by, code, description, name, status) VALUES ('2026-07-20 11:15:17.000000', null, 354612119062319104, '2026-07-20 11:15:17.000000', null, 'STUDENT_AFF', 'Hỗ trợ đời sống, sinh hoạt và kỷ luật sinh viên.', 'Phòng Công tác Sinh viên', 'ACTIVE');
INSERT INTO ailms.department (created_at, created_by, id, updated_at, updated_by, code, description, name, status) VALUES ('2026-07-20 11:15:17.000000', null, 354612119066513408, '2026-07-20 11:15:17.000000', null, 'LIBRARY', 'Quản lý tài nguyên học liệu, sách và phòng đọc.', 'Thư viện', 'ACTIVE');
INSERT INTO ailms.department (created_at, created_by, id, updated_at, updated_by, code, description, name, status) VALUES ('2026-07-20 11:15:17.000000', null, 354612119070707712, '2026-07-20 11:15:17.000000', null, 'MARKETING', 'Truyền thông thương hiệu và tư vấn tuyển sinh.', 'Phòng Truyền thông - Tuyển sinh', 'ACTIVE');
INSERT INTO ailms.department (created_at, created_by, id, updated_at, updated_by, code, description, name, status) VALUES ('2026-07-20 11:15:17.000000', null, 354612119079096320, '2026-07-20 11:15:17.000000', null, 'FACILITY', 'Quản lý phòng học, trang thiết bị và tài sản.', 'Phòng Quản trị - Cơ sở vật chất', 'INACTIVE');
