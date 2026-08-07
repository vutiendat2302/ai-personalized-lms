package com.ailms.request;

import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateClassOnlineRequest {

    @NotNull(message = "Class ID is required")
    private Long classId;

    @NotNull(message = "Teacher ID is required")
    private Long teacherId;

    private String title;

    private String meetingUrl;

    private String meetingProvider;

    @com.fasterxml.jackson.annotation.JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime scheduledAt;

    private Integer durationMin;

    private String recordUrl;

    private String sessionSummary;

    private String studentFeedback;

    private String teacherNotes;

    private String nextSessionNotes;

}
