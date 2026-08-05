package com.ailms.response;

import com.ailms.entity.enums.CourseTeacherStatusEnum;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CourseTeacherResponse {

    private Long courseId;

    private Long userId;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime assignedAt;

    private Long assignedBy;

    private CourseTeacherStatusEnum status;
}
