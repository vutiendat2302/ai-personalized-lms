package com.ailms.request;

import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateHasGoalRequest {

    @NotNull(message = "hasGoal status must not be null")
    private Boolean hasGoal;
}
