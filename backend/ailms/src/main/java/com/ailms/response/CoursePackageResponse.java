package com.ailms.response;

import com.ailms.entity.enums.DeliveryModeEnum;
import com.ailms.entity.enums.CoursePackageStatusEnum;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CoursePackageResponse {
    private Long id;
    private String code;
    private Long courseId;
    private String courseName;
    private Long classId;
    private String className;
    private Integer currentMemberCount;
    private Integer maxMembers;
    private String name;
    private DeliveryModeEnum deliveryMode;
    private BigDecimal price;
    private BigDecimal originalPrice;
    private BigDecimal discountPercentage;
    private Integer durationDays;
    private Integer includedTutorSessions;
    private Integer maxGroupSize;
    private CoursePackageStatusEnum status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Long createdBy;
    private Long updatedBy;

}
