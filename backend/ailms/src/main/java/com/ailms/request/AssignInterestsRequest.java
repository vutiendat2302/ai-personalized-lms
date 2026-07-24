package com.ailms.request;

import jakarta.validation.constraints.NotEmpty;
import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AssignInterestsRequest {

    @NotEmpty(message = "Interest IDs list cannot be empty")
    private List<Long> interestIds;
}
