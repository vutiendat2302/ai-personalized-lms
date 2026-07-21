package com.ailms.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateInterestRequest {

    @NotBlank(message = "Interest code must not be blank")
    @Size(max = 50, message = "Interest code must not exceed 50 characters")
    private String code;

    private String name;

    private String description;
}
