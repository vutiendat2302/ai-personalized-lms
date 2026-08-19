package com.ailms.request;

import jakarta.validation.constraints.*;
import lombok.*;

import java.time.LocalDateTime;

/** Thông tin lớp và buổi thử được tạo khi HR xác nhận kết nối hai bên. */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OneOnOneTrialClassRequest {
    @NotBlank(message = "Tên lớp thử là bắt buộc")
    @Size(max = 255)
    private String className;

    private LocalDateTime startAt;

    private LocalDateTime endAt;

    @NotBlank(message = "Hình thức học là bắt buộc")
    @Size(max = 100)
    private String learningMode;

    @Size(max = 500)
    private String linkOrLocation;

    private String notes;
}
