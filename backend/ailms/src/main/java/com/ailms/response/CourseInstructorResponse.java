package com.ailms.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CourseInstructorResponse {

    private String id;
    private String courseId;
    private String courseName;
    private String instructorId;
    private String instructorName;
    private String instructorEmail;
    private String instructorAvatar;
    private String status; // PENDING, ACCEPTED, REJECTED
    private String invitedBy;
    private String invitedByName;
    private LocalDateTime invitedAt;
    private LocalDateTime acceptedAt;
    private boolean isOwner;
}
