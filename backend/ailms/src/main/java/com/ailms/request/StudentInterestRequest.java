package com.ailms.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudentInterestRequest {

    @NotNull(message = "Student user ID is required")
    private Long studentUserId;

    @NotNull(message = "Interest ID is required")
    private Long interestId;

    private String note;
}
