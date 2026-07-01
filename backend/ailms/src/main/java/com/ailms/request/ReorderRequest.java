package com.ailms.request;

import jakarta.validation.constraints.NotEmpty;
import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReorderRequest {

    @NotEmpty(message = "IDs list must not be empty")
    private List<Long> ids;

}
