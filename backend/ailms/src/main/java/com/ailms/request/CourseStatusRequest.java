package com.ailms.request;

import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CourseStatusRequest {

    @NotNull(message = "Status is required")
    private Byte status;

}
