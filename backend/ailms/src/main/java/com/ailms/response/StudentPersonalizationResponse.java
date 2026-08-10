package com.ailms.response;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

/** Thông tin onboarding và các lựa chọn cá nhân hóa của học viên. */
@Getter
@Builder
public class StudentPersonalizationResponse {
    private Long userId;
    private String educationLevel;
    private String goal;
    private String description;
    private String schoolName;
    private Boolean hasGoal;
    private List<StudentPortalItemResponse.GoalItem> studyGoals;
    private List<InterestItem> interests;
    private List<InterestItem> topics;

    /** Thông tin một chủ đề/sở thích mà học viên đã chọn. */
    @Getter
    @Builder
    public static class InterestItem {
        private Long id;
        private String code;
        private String name;
        private String description;
        private String note;
    }
}
