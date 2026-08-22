package com.ailms.request;

import com.ailms.entity.enums.DeliveryModeEnum;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateClassRequest {

    private Long courseId;

    private Long categoryId;

    private String name;

    private String description;

    private Boolean registrationOpen;

    private Boolean allowLateEnrollment;

    private Byte type;

    private DeliveryModeEnum packageType;

    private Integer maxMembers;

    private LocalDateTime startDate;

    private LocalDateTime endDate;
}
