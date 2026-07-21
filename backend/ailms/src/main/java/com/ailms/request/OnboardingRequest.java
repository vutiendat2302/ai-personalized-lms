package com.ailms.request;

import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OnboardingRequest {

    @NotNull(message = "User ID is required")
    private Long userId;

    private StudyGoalRequest goal;

    private List<Long> interestIds;
}
