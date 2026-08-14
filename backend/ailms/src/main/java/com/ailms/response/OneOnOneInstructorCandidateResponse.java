package com.ailms.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** Người dạy hợp lệ cùng danh mục mà HR có thể gửi yêu cầu 1-1. */
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OneOnOneInstructorCandidateResponse {
    private Long instructorId;
    private String instructorName;
    private String employeeCode;
    private String role;
}
