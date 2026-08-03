package com.ailms.response;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudentProfileResponse {

    private Long userId;

    private Long id;
    private String fullName;
    private String email;
    private String phone;
    private String avatarUrl;
    private Integer gender;
    private LocalDateTime dateOfBirth;
    private String status;
    private Integer currentStreak;
    private Integer longestStreak;
    private java.util.List<String> goalTypes;
    private LocalDateTime lastActiveAt;
    private String enrolledCourseName;
    private Boolean hasGuardian;

    private String studentCode;

    private String educationLevel;

    private String description;

    private String goal;

    private String schoolName;

    private Boolean isMinor;

    private Boolean hasGoal;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime updatedAt;
}
