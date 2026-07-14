package com.ailms.request;

import com.ailms.entity.BaseStatusEnum;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DepartmentStatusRequest {

    @NotNull(message = "Status must not be null")
    private BaseStatusEnum status;
}
