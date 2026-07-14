package com.ailms.response;

import com.ailms.entity.UserStatusEnum;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class UserResponse {
    private Long id;
    private String username;
    private String email;
    private String fullName;
    private String phone;
    private String avatarUrl;
    private Integer gender;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDateTime dateOfBirth;

    private UserStatusEnum status;
    private LocalDateTime lastLoginAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<String> roles;
}
