package com.ailms.response.ai;

import lombok.Data;
import java.util.List;

/** Draft assessment có TTL, chỉ được owner xác nhận mới tạo quiz/assignment thật. */
@Data
public class AiAssessmentDraftResponse {
    private String draftId;
    private String lessonId;
    private String expiresAt;
    private boolean requiresConfirmation;
    private AiGeneratedQuizResponse quiz;
    private AiGeneratedAssignmentResponse assignment;
    private List<AiAssessmentSourceResponse> sources;
}
