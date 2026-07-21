package com.ailms.dto;

import lombok.*;

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
