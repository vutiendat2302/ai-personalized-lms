package com.ailms.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

/** Yêu cầu hủy ghép hiện tại, cập nhật nhu cầu và tìm người dạy khác. */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OneOnOneRematchRequest {
    @NotBlank(message = "Lý do đổi người dạy là bắt buộc")
    @Size(max = 1000)
    private String reason;

    @Valid
    @NotNull(message = "Nhu cầu học tập cập nhật là bắt buộc")
    private OneOnOneNeedsRequest needs;
}
