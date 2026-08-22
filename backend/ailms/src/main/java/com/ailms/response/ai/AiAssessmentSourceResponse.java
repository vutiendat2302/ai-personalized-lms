package com.ailms.response.ai;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Nguồn đã được dùng để tạo assessment draft, không chứa nội dung tài liệu. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiAssessmentSourceResponse {
    private String sourceId;
    private String sourceType;
    private String title;
    private String fileName;
}
