package com.ailms.request;

import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CourseProgressRequest {

    @NotNull(message = "User ID is required")
    private Long userId;

    @NotNull(message = "Course ID is required")
    private Long courseId;

    @NotNull(message = "Enrollment ID is required")
    private Long enrollmentId;

    private Integer totalSection;

    private Integer totalLessons;

    private Integer completedLessons;

    private Integer progressPercent;

    private BigDecimal avgQuizScore;

    private Integer completedAssignments;

    private Long lastLessonId;

    private LocalDateTime lastAccessedAt;
}
