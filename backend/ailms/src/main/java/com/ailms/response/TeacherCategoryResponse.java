package com.ailms.response;

import com.ailms.entity.enums.BaseStatusEnum;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TeacherCategoryResponse {

    private Long id;

    private Long employeeId;

    private String employeeName;

    private String employeeCode;

    private Long categoryId;

    private String categoryName;

    private BaseStatusEnum status;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}
