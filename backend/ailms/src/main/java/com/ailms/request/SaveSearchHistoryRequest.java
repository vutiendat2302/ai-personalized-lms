package com.ailms.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SaveSearchHistoryRequest {

    @NotBlank(message = "Keyword cannot be blank")
    @Size(max = 255, message = "Keyword cannot be longer than 255 characters")
    private String keyword;

    private Long courseId;
}
