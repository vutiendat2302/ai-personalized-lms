package com.ailms.request;

import com.ailms.entity.enums.BaseStatusEnum;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AssignmentRequest {

    private Long lessonId;

    private Long courseId;

    private Long sectionId;

    private Long classId;

    @NotBlank(message = "Title must not be blank")
    private String title;

    private String description;

    private BigDecimal maxScore;

    private LocalDateTime dueDate;

    private Boolean allowLate;

    private BaseStatusEnum status;
}
