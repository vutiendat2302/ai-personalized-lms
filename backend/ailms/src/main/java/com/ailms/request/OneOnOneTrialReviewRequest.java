package com.ailms.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

/** Nhận xét bắt buộc của người dạy sau buổi học thử 1-1. */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OneOnOneTrialReviewRequest {
    @NotBlank private String currentLevel;
    @NotBlank private String weakAreas;
    @NotBlank private String learningAttitude;
    @NotBlank private String recommendedPath;
    private String additionalNotes;
}
