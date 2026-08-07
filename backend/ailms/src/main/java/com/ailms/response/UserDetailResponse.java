package com.ailms.response;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserDetailResponse {

    /**
     * Thông tin tài khoản người dùng (user)
     */
    private UserResponse userAccount;

    /**
     * Thông tin hồ sơ học viên (nếu là học viên)
     */
    private StudentProfileResponse studentProfile;

    /**
     * Danh sách phụ huynh / người giám hộ (nếu học viên là người vị thành niên hoặc có khai báo)
     */
    private List<GuardianResponse> guardians;

    /**
     * Thông tin hồ sơ nhân viên (nếu là nhân viên / giảng viên)
     */
    private EmployeeResponse employeeProfile;

    /**
     * Thông tin hệ thống (baseEntity)
     */
    private Long createdBy;
    private Long updatedBy;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createdAt;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime updatedAt;
}
