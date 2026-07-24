package com.ailms.request;

import com.ailms.entity.enums.BaseStatusEnum;
import com.ailms.entity.enums.DeliveryModeEnum;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateClassRequest {
    private String name;

    private Byte type;

    private DeliveryModeEnum packageType;

    private Integer maxMembers;
    private Integer currentMemberCount;

    private LocalDateTime startDate;

    private LocalDateTime endDate;

    private BaseStatusEnum status;

}
