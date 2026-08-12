package com.ailms.response.ai;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/** Kết quả dữ liệu tối thiểu của một tool để Gemini diễn giải. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiToolExecutionResponse {
    private String toolName;
    private Map<String, Object> result;
}
