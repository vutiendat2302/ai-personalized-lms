package com.ailms.request;

import com.ailms.entity.enums.CertificateConditionTypeEnum;
import com.ailms.entity.enums.CourseLevelEnum;
import com.ailms.entity.enums.CourseStatusEnum;
import jakarta.persistence.Column;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateCourseRequest {

    private String name;

    private String link;

    private String description;

    private String thumbnailUrl;

    private String learningObjectives;

    private String prerequisites;

    private String level;

    private BigDecimal suggestedPrice;

    private CertificateConditionTypeEnum certificateConditionType;

    private Integer certificatePassThreshold;

    private String rejectionReason;

    private CourseStatusEnum status;

}
