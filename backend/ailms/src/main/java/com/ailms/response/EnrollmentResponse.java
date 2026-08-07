package com.ailms.response;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EnrollmentResponse {

    private Long id;

    // User info
    private Long userId;
    private String studentName;
    private String studentEmail;
    private String studentPhone;
    private String studentAvatar;

    // Course & Class info
    private Long courseId;
    private String courseName;

    private Long classId;
    private String className;

    /**
     * Trạng thái ghi danh:
     * 0 = IN_PROGRESS (ACTIVE)
     * 1 = COMPLETED
     * 2 = EXPIRED
     * 3 = CANCELLED (DROPPED)
     */
    private Byte status;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime enrolledAt;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime completedAt;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime updatedAt;
}
