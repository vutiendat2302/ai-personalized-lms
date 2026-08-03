package com.ailms.response;

import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminTeachingScheduleResponse {
    private Long id;
    private Long classId;
    private String className;
    private String courseName;
    private String title;
    private LocalDateTime startAt;
    private LocalDateTime endAt;
    private String status;
    private String deliveryMode;
    private String meetingUrl;
    private List<TeachingResource> resources;
    private List<StudentSummary> students;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class TeachingResource {
        private Long userId;
        private String fullName;
        private String email;
        private String role;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class StudentSummary {
        private Long userId;
        private String fullName;
        private String email;
        private String phone;
        private LocalDateTime joinedAt;
    }
}
