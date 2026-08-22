package com.ailms.response.ai;

import lombok.Builder;
import lombok.Data;

/** Tài liệu lớp đã được phân quyền và có thể chọn làm nguồn RAG cho assessment. */
@Data
@Builder
public class AiAssessmentMaterialResponse {
    private String id;
    private String classId;
    private String courseId;
    private String title;
    private String fileName;
    private String fileType;
    private String ragStatus;
    private boolean canUseForAi;
}
