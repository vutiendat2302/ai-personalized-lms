package com.ailms.response;

import com.ailms.entity.enums.ClassMemberRole;
import com.ailms.entity.enums.ClassMemberStatusEnum;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ClassMemberResponse {
    private Long classId;
    private String className;
    private Long userId;
    private String username;
    private ClassMemberRole roleInClass;
    private ClassMemberStatusEnum status;
    private LocalDateTime joinedAt;
    private LocalDateTime waitlistedAt;
    private LocalDateTime leftAt;
}
