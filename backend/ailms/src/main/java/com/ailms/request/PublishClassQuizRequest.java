package com.ailms.request;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDateTime;

/** Cấu hình tạo một bản phát hành Quiz riêng cho lớp từ Quiz nguồn. */
@Data
public class PublishClassQuizRequest {
    @Size(max = 255)
    private String title;

    private LocalDateTime availableFrom;

    @Future(message = "Hạn nộp phải ở tương lai")
    private LocalDateTime dueAt;

    @Min(1)
    @Max(20)
    private Integer maxAttempts;

    private Boolean showResultAfterSubmit;
}
