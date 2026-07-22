package com.ailms.request;

import com.ailms.entity.enums.CourseStatusEnum;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@EqualsAndHashCode(callSuper = false) // Khong so sanh in hoa voi in thuong
public class CourseSearchRequest extends CommonSearchRequest<CourseStatusEnum> {

}
