package com.ailms.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateGroupClassRequest {

    @NotNull(message = "Course ID is required")
    private Long courseId;

    @NotNull(message = "Category ID is required")
    private Long categoryId;

    @NotBlank(message = "Class name is required")
    private String name;

    @NotNull(message = "Max members is required")
    private Integer maxMembers;

    private LocalDateTime startDate;

    private LocalDateTime endDate;

    private Long teacherEmployeeId;

    private List<ScheduleSlotRequest> schedules;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ScheduleSlotRequest {
        private Integer dayOfWeek; // 1-7
        private LocalTime startTime;
        private LocalTime endTime;
    }
}
