package com.ailms.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Payload đổi giáo viên lớp trong một transaction quản trị duy nhất. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReplaceClassTeacherRequest {
    @NotNull
    private Long newTeacherUserId;

    @NotBlank
    @Size(max = 1000)
    private String reason;
}
