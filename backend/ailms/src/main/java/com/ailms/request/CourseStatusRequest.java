package com.ailms.request;

import com.ailms.entity.enums.CourseStatusEnum;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CourseStatusRequest {

    private CourseStatusEnum status;

}
