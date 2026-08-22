package com.ailms.request;

import com.ailms.entity.enums.BaseStatusEnum;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class UpdateAdminTeachingScheduleRequest {
    @Size(max = 255, message = "Tiêu đề không được vượt quá 255 ký tự")
    private String title;

    @NotNull(message = "Thời gian bắt đầu không được để trống")
    private LocalDateTime scheduledAt;

    @NotNull(message = "Thời lượng không được để trống")
    @Min(value = 15, message = "Thời lượng tối thiểu là 15 phút")
    @Max(value = 720, message = "Thời lượng tối đa là 720 phút")
    private Integer durationMin;

    @Size(max = 1000, message = "Liên kết phòng học không được vượt quá 1000 ký tự")
    private String meetingUrl;

    @NotNull(message = "Trạng thái không được để trống")
    private BaseStatusEnum status;
}
