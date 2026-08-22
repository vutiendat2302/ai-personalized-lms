package com.ailms.request.ai;

import lombok.Builder;
import lombok.Data;

/** File nguồn tạm thời đã được Backend validate trước khi gửi AI Service. */
@Data
@Builder
public class AiAssessmentSourceFile {
    private String name;
    private String mimeType;
    private String contentBase64;
}
