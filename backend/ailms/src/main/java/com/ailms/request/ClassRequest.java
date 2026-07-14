package com.ailms.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ClassRequest {

    @NotNull(message = "Course ID is required")
    private Long courseId;

    @NotBlank(message = "Class name must not be blank")
    private String name;

    private Byte type;

    private Integer maxMembers;

    private Byte status;

    private LocalDateTime startDate;

    private LocalDateTime endDate;
}
