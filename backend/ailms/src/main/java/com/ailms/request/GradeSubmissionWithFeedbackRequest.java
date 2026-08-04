package com.ailms.request;

import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;

/**
 * Request DTO phục vụ việc chấm điểm bài nộp Assignment từ Giảng viên.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GradeSubmissionWithFeedbackRequest {

    @NotNull(message = "Điểm số không được để trống")
    private BigDecimal score;

    private String feedback;

    @Builder.Default
    private Boolean returnForResubmission = false;
}
