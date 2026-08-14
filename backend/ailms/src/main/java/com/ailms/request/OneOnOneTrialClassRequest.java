package com.ailms.request;

import jakarta.validation.constraints.*;
import lombok.*;

import java.time.LocalDateTime;

/** Thông tin lớp và buổi thử do người dạy đã nhận yêu cầu tạo. */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OneOnOneTrialClassRequest {
    @NotBlank(message = "Tên lớp thử là bắt buộc")
    @Size(max = 255)
    private String className;

    @NotNull(message = "Thời gian bắt đầu là bắt buộc")
    private LocalDateTime startAt;

    @NotNull(message = "Thời gian kết thúc là bắt buộc")
    private LocalDateTime endAt;

    @NotBlank(message = "Hình thức học là bắt buộc")
    @Size(max = 100)
    private String learningMode;

    @Size(max = 500)
    private String linkOrLocation;

    private String notes;
}
