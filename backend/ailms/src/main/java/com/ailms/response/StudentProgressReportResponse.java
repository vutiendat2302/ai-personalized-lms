package com.ailms.response;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudentProgressReportResponse {

    private Long studentUserId;

    private String studentName;

    private String email;

    private Double progressPercent;

    private BigDecimal avgQuizScore;

    private Integer completedAssignments;

    private LocalDateTime lastAccessedAt;

    private Boolean isAtRisk;
}
