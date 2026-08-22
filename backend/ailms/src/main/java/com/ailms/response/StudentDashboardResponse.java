package com.ailms.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/** Các chỉ số và hạn học tập gần nhất trên dashboard học viên. */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentDashboardResponse {
    private int currentStreak;
    private int longestStreak;
    private long activeCoursesCount;
    private long completedCoursesCount;
    private long upcomingDeadlinesCount;
    private BigDecimal averageQuizScore;
    private boolean hasSetGoals;
    private List<UpcomingAssignment> upcomingAssignments;

    /** Thông tin rút gọn của một bài tập sắp đến hạn. */
    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpcomingAssignment {
        private Long id;
        private Long courseId;
        private String courseName;
        private String title;
        private LocalDateTime dueDate;
        private boolean urgent;
    }
}
