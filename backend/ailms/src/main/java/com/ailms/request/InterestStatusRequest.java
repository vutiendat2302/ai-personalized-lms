package com.ailms.request;

import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InterestStatusRequest {

    @NotNull(message = "Status must not be null")
    private Byte status;
}
