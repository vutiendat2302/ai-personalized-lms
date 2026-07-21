package com.ailms.request;

import com.ailms.entity.enums.BaseStatusEnum;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateAssignmentRequest {

    private Long lessonId;

    private Long courseId;

    private Long sectionId;

    @NotBlank(message = "Title is required")
    private String title;

    private String description;

    @NotNull(message = "Max score is required")
    private BigDecimal maxScore;

    @NotNull(message = "Due date is required")
    private LocalDateTime dueDate;

    @Builder.Default
    private Boolean allowLate = false;

    @Builder.Default
    private BaseStatusEnum status = BaseStatusEnum.ACTIVE; // 1 = PUBLISHED, 0 = DRAFT
}
