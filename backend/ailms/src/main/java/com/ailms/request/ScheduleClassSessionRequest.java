package com.ailms.request;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/** Dữ liệu người dạy nhập khi đặt một buổi học mới cho lớp. */
@Getter
@Setter
public class ScheduleClassSessionRequest {

    @Size(max = 255, message = "Tiêu đề tối đa 255 ký tự")
    private String title;

    @Size(max = 1000, message = "Đường dẫn phòng học tối đa 1000 ký tự")
    private String meetingUrl;

    @Size(max = 50, message = "Nền tảng phòng học tối đa 50 ký tự")
    private String meetingProvider;

    @NotNull(message = "Thời gian bắt đầu là bắt buộc")
    @Future(message = "Thời gian bắt đầu phải ở tương lai")
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime scheduledAt;

    @NotNull(message = "Thời lượng buổi học là bắt buộc")
    @Min(value = 15, message = "Thời lượng tối thiểu là 15 phút")
    @Max(value = 480, message = "Thời lượng tối đa là 480 phút")
    private Integer durationMin;
}
