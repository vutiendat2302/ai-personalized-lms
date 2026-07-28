package com.ailms.request;

import com.ailms.entity.enums.EmployeeStatusEnum;
import com.ailms.entity.enums.EmploymentTypeEnum;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(callSuper = false)
public class EmployeeSearchRequest extends CommonSearchRequest<EmployeeStatusEnum> {

    private EmploymentTypeEnum employmentTypeEnum;
    private Long departmentId;
    private List<Long> roleIds;
    private Integer gender;
    private List<Long> userIds;
    private com.ailms.entity.enums.UserStatusEnum userStatus;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime startDateFrom;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime endDateTo;
}
