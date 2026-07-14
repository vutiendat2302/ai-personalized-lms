package com.ailms.request;

import com.ailms.entity.ClassMemberRole;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CourseMemberRequest {

    @NotNull(message = "Course ID is required")
    private Long courseId;

    @NotNull(message = "User ID is required")
    private Long userId;

    private ClassMemberRole roleInClass;

    private LocalDateTime joinedAt;

    private LocalDateTime leftAt;
}
