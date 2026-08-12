package com.ailms.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

/** Nhu cầu học tập học viên cung cấp khi mua gói 1-1. */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OneOnOneNeedsRequest {
    @NotBlank(message = "Khoảng thời gian có thể học là bắt buộc")
    @Size(max = 255)
    private String availablePeriod;

    @NotBlank(message = "Ngày có thể học là bắt buộc")
    @Size(max = 255)
    private String availableDays;

    @NotBlank(message = "Khung giờ mong muốn là bắt buộc")
    @Size(max = 500)
    private String preferredTimes;

    @NotBlank(message = "Trình độ hiện tại là bắt buộc")
    @Size(max = 255)
    private String currentLevel;

    @NotBlank(message = "Tình hình học tập là bắt buộc")
    @Size(max = 2000, message = "Tình hình học tập không được vượt quá 2000 ký tự")
    private String learningSituation;

    @NotBlank(message = "Mục tiêu học tập là bắt buộc")
    @Size(max = 2000, message = "Mục tiêu học tập không được vượt quá 2000 ký tự")
    private String learningGoals;

    @NotBlank(message = "Nội dung đang yếu là bắt buộc")
    @Size(max = 2000, message = "Nội dung đang yếu không được vượt quá 2000 ký tự")
    private String weakAreas;

    @Size(max = 2000, message = "Mong muốn đối với gia sư không được vượt quá 2000 ký tự")
    private String instructorPreferences;

    @Size(max = 2000, message = "Ghi chú bổ sung không được vượt quá 2000 ký tự")
    private String additionalNotes;
}
