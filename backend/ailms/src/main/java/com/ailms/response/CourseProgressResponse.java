package com.ailms.response;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CourseProgressResponse {

    private Long id;

    private Long userId;

    private Long courseId;

    private Long enrollmentId;

    private Integer totalSection;

    private Integer totalLessons;

    private Integer completedLessons;

    private Integer progressPercent;

    private BigDecimal avgQuizScore;

    private Integer completedAssignments;

    private Long lastLessonId;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime lastAccessedAt;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime updatedAt;
}
