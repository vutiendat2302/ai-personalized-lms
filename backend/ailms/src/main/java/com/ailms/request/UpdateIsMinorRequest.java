package com.ailms.request;

import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateIsMinorRequest {

    @NotNull(message = "isMinor status must not be null")
    private Boolean isMinor;
}
