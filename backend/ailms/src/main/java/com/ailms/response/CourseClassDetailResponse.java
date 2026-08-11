package com.ailms.response;

import com.ailms.entity.enums.BaseStatusEnum;
import com.ailms.entity.enums.DeliveryModeEnum;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

/** Dữ liệu lớp nhóm được công khai cùng gói bán của khóa học. */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CourseClassDetailResponse {
    private Long id;
    private String code;
    private String name;
    private String description;
    private Long courseId;
    private String courseName;
    private String timeZone;
    private DeliveryModeEnum deliveryMode;
    private Person teacher;
    private List<Person> teachingAssistants;
    private LocalDateTime startDate;
    private LocalDateTime endDate;
    private List<ClassScheduleResponse> schedules;
    private Integer currentStudents;
    private Integer maxMembers;
    private Integer remainingSlots;
    private BaseStatusEnum status;
    private Boolean registrationOpen;
    private Boolean allowLateEnrollment;
    private Boolean purchasable;
    private String unavailableReason;

    /** Thông tin tối thiểu của giáo viên hoặc trợ giảng trong lớp. */
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Person {
        private Long id;
        private String fullName;
        private String avatarUrl;
    }
}
