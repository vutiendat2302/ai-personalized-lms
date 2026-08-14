package com.ailms.request.ai;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/** Yêu cầu nội bộ để AI Service thực thi một tool dữ liệu đã được Gemini chọn. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiToolExecutionRequest {

    @NotBlank(message = "Tên tool không được để trống")
    @Size(max = 128, message = "Tên tool tối đa 128 ký tự")
    private String toolName;

    @NotNull(message = "Đối số tool không được null")
    @Builder.Default
    private Map<String, Object> arguments = Map.of();

    @NotBlank(message = "Tool access token không được để trống")
    private String toolAccessToken;
}
