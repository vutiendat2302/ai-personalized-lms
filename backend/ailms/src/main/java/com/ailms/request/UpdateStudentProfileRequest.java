package com.ailms.request;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateStudentProfileRequest {

    private String educationLevel;

    private String description;

    private String goal;

    private String schoolName;
}