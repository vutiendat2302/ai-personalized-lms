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

    @Size(max = 3000, message = "Note must not exceed 3000 characters")
    private String note;
}
