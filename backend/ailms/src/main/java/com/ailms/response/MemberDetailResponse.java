package com.ailms.response;

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
public class MemberDetailResponse {
    private Long userId;
    private String fullName;
    private String username;
    private String email;
    private String phone;
    private String avatarUrl;
    private String roleInClass;
    private LocalDateTime joinedAt;
    private String studentCode;
    private String employeeCode;
    private String departmentName;
    private List<DegreeDetail> degrees;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DegreeDetail {
        private String degreeName;
        private String institution;
        private String yearOfGraduation;
        private String major;
    }
}
