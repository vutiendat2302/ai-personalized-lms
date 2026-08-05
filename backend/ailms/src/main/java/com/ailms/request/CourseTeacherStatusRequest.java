package com.ailms.request;

import com.ailms.entity.enums.CourseTeacherStatusEnum;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CourseTeacherStatusRequest {

    @NotNull(message = "Status is required")
    private CourseTeacherStatusEnum status;
}
