package com.ailms.request;

import com.ailms.common.snowflake.SnowflakeId;
import com.ailms.entity.CategoryEntity;
import com.ailms.entity.EmployeeEntity;
import com.ailms.entity.enums.BaseStatusEnum;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateTeacherCategoryRequest {

    private Long categoryId;

    private LocalDateTime unassignedAt;

    private BaseStatusEnum status;
}
