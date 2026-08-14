package com.ailms.response.ai;

import com.ailms.response.AssignmentResponse;
import com.ailms.response.QuizResponse;
import lombok.Builder;
import lombok.Data;

/** Kết quả lưu assessment draft vào lesson bằng service authoring chính thức. */
@Data
@Builder
public class AiAssessmentApplyResponse {
    private QuizResponse quiz;
    private AssignmentResponse assignment;
}
