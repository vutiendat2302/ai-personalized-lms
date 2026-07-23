package com.ailms.response;

import com.ailms.entity.enums.CertificateConditionTypeEnum;
import com.ailms.entity.enums.CourseStatusEnum;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CourseResponse {

    private Long id;
    
    private Long categoryId;
    
    private String categoryName;
    
    private String name;
    
    private String link;
    
    private String description;

    private BigDecimal suggestedPrice;
    
    private String level;
    
    private CourseStatusEnum status;

    private String rejectionReason;

    private Double avgRating;

    private Integer reviewCount;

    private Integer viewCount;

    private Integer enrollmentCount;

    private Double trendingScore;

    private CertificateConditionTypeEnum certificateConditionType;

    private Integer certificatePassThreshold;
    
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;
    
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime updatedAt;
}
