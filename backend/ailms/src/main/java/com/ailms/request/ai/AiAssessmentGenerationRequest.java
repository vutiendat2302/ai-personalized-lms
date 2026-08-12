package com.ailms.request.ai;

import lombok.Builder;
import lombok.Data;

import java.util.List;

/** Request nội bộ gửi lesson context và file tạm thời sang AI Service để sinh assessment draft. */
@Data
@Builder
public class AiAssessmentGenerationRequest {
    private String lessonId;
    private String lessonTitle;
    private String lessonContent;
    private String assessmentType;
    private Integer questionCount;
    private List<AiAssessmentSourceFile> sourceFiles;
}
