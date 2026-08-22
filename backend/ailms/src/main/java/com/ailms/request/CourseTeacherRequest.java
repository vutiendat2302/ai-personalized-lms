package com.ailms.request;

import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CourseTeacherRequest {

    @NotNull(message = "Course ID is required")
    private Long courseId;

    @NotNull(message = "User ID is required")
    private Long userId;

    private LocalDateTime assignedAt;

    private Long assignedBy;

    private com.ailms.entity.enums.CourseTeacherStatusEnum status;
}
