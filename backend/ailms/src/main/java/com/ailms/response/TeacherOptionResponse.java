package com.ailms.response;

import lombok.*;

/**
 * DTO ngắn gọn phục vụ tìm kiếm và chọn Giảng viên phụ trách trong hệ thống.
 * Chỉ bao gồm: Tên giảng viên, Mã nhân viên, Phòng ban.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TeacherOptionResponse {

    private String id;
    private String fullName;
    private String employeeCode;
    private String departmentName;
    private String email;
    private String avatarUrl;
}
