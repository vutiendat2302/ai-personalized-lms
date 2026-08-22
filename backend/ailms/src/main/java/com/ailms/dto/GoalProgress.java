package com.ailms.dto;

import lombok.*;

/**
 * lưu kết quả đánh giá tiến độ của một mục tiêu học tập.
 * trả về sau khi hệ thống tính toán tiến độ hoàn thành goal.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GoalProgress {
    private int currentValue;
    private int targetValue;
    private boolean isAchieved;
    private int currentStreak;
    private int longestStreak;
}
