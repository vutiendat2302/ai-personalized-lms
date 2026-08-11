package com.ailms.response;

import lombok.*;

import java.util.List;

/**
 * DTO phản hồi cây nội dung đầy đủ của khóa học (Course -> Section -> Lesson + Quiz/Assignment 3 cấp).
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CourseCurriculumResponse {

    private Long courseId;
    private String courseName;
    private String status;
    private Long createdBy;

    private List<SectionCurriculumItem> sections;
    private List<QuizResponse> finalExamQuizzes;
    private List<AssignmentResponse> finalExamAssignments;

    private Integer totalLessons;
    private Integer totalDurationMin;
    private Long enrollmentId;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SectionCurriculumItem {
        private Long id;
        private String name;
        private Integer orderIndex;
        private String status;
        private List<QuizResponse> chapterQuizzes;
        private List<AssignmentResponse> chapterAssignments;
        private List<LessonCurriculumItem> lessons;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class LessonCurriculumItem {
        private Long id;
        private String name;
        private String title;
        private String contentType;
        private String contentUrl;
        private String description;
        private Integer durationMin;
        private Integer duration;
        private Integer orderIndex;
        private String previewType;
        private String status;
        private QuizResponse linkedQuiz;
        private AssignmentResponse linkedAssignment;
        private List<ResourceResponse> resources;
        private Boolean completed;
        private Integer progressPercent;
        private Integer lastPositionSec;
        private Boolean preview;
        private Boolean accessible;
        private Boolean locked;
    }
}
