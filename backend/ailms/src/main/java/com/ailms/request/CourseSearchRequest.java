package com.ailms.request;

import com.ailms.entity.enums.CourseLevelEnum;
import com.ailms.entity.enums.CourseStatusEnum;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = false)
public class CourseSearchRequest extends CommonSearchRequest<CourseStatusEnum> {
    private Long categoryId;
    private CourseLevelEnum level;
    private Long createdBy;
}
