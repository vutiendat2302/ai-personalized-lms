package com.ailms.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ClassOnlineRequest {

    @NotNull(message = "Class ID is required")
    private Long classId;

    @NotNull(message = "Teacher ID is required")
    private Long teacherId;

    @NotBlank(message = "Title must not be blank")
    private String title;

    private String meetingUrl;

    private LocalDateTime scheduledAt;

    private Integer durationMin;

    private Byte status;
}
