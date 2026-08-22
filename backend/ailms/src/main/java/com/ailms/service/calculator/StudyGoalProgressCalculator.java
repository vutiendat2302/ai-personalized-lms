package com.ailms.service.calculator;

import com.ailms.dto.GoalProgress;
import com.ailms.entity.StudyGoalEntity;
import com.ailms.entity.enums.StudyGoalTypeEnum;

import java.time.LocalDateTime;

/**
 * Giao diện bộ tính toán tiến độ mục tiêu học tập theo từng loại mục tiêu cụ thể.
 */
public interface StudyGoalProgressCalculator {

    /**
     * Lấy loại mục tiêu học tập mà bộ tính toán này hỗ trợ.
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    StudyGoalTypeEnum getType();

    /**
     * Tính toán tiến độ của mục tiêu học tập tại thời điểm cụ thể.
     *
     * @param goal Thực thể mục tiêu học tập
     * @param asOfDate Thời điểm tính toán tiến độ
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    GoalProgress calculateProgress(StudyGoalEntity goal, LocalDateTime asOfDate);
}
