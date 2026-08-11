package com.ailms.response;

import com.ailms.entity.enums.BaseStatusEnum;
import com.ailms.entity.enums.SessionKindEnum;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ClassOnlineResponse {

    private Long id;

    private Long classId;

    private String className;

    private String classCode;

    private Long teacherId;

    private String teacherName;

    private String title;

    private String meetingUrl;

    private String meetingProvider;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime scheduledAt;

    private Integer durationMin;

    private BaseStatusEnum status;

    private String lifecycleStatus;

    private String sessionCode;

    private BigDecimal teachingRatePerHour;

    private Integer actualDurationMin;

    private BigDecimal remuneration;

    private String paymentStatus;

    private String recordUrl;

    private String sessionSummary;

    private String studentFeedback;

    private String teacherNotes;

    private String nextSessionNotes;

    private SessionKindEnum sessionKind;

    private Boolean countsTowardPackage;

    private Boolean payable;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime updatedAt;
}
