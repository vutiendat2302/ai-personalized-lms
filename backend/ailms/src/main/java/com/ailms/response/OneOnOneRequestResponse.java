package com.ailms.response;

import com.ailms.entity.enums.OneOnOneRequestStatusEnum;
import lombok.*;

import java.time.LocalDateTime;

/** Dữ liệu yêu cầu 1-1 không chứa điện thoại, Zalo hoặc thông tin liên hệ riêng tư. */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OneOnOneRequestResponse {
    private Long id;
    private Long orderId;
    private Long studentId;
    private String studentName;
    private Long courseId;
    private String courseName;
    private Long categoryId;
    private String categoryName;
    private Long coursePackageId;
    private String packageName;
    private Integer includedTutorSessions;
    private OneOnOneRequestStatusEnum status;
    private Long assignedInstructorId;
    private String assignedInstructorName;
    private Long trialClassId;
    private Long trialSessionId;
    private String availablePeriod;
    private String availableDays;
    private String preferredTimes;
    private String currentLevel;
    private String learningSituation;
    private String learningGoals;
    private String weakAreas;
    private String instructorPreferences;
    private String additionalNotes;
    private String reviewCurrentLevel;
    private String reviewWeakAreas;
    private String reviewAttitude;
    private String reviewRecommendedPath;
    private String reviewNotes;
    private LocalDateTime createdAt;
}
