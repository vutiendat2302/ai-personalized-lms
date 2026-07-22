package com.ailms.request;

import com.ailms.entity.enums.BaseStatusEnum;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateClassOnlineRequest {

    private String title;

    private String meetingUrl;

    private LocalDateTime scheduledAt;

    private Integer durationMin;

    private BaseStatusEnum status;
}
