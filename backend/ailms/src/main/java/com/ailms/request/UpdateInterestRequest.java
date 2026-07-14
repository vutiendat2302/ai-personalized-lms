package com.ailms.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateInterestRequest {

    @NotBlank(message = "Interest code must not be blank")
    @Size(max = 50, message = "Interest code must not exceed 50 characters")
    private String code;

    @NotBlank(message = "Interest name must not be blank")
    @Size(max = 255, message = "Interest name must not exceed 255 characters")
    private String name;

    @Size(max = 3000, message = "Description must not exceed 3000 characters")
    private String description;
}
