package com.ailms.request;

import com.ailms.common.snowflake.SnowflakeId;
import com.ailms.entity.CategoryEntity;
import com.ailms.entity.CourseSectionEntity;
import com.ailms.entity.enums.CertificateConditionTypeEnum;
import com.ailms.entity.enums.CourseLevelEnum;
import com.ailms.entity.enums.CourseStatusEnum;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateCourseRequest {

    @NotNull(message = "Category ID is required")
    private Long categoryId;

    private String name;

    private String link;

    private String description;

    private BigDecimal suggestedPrice;

    private CourseLevelEnum level;

    private CourseStatusEnum status;

    private CertificateConditionTypeEnum certificateConditionType;

    private Integer certificatePassThreshold;

}
