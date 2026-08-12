package com.ailms.request.ai;

import jakarta.validation.constraints.AssertTrue;
import lombok.Data;

/** Xác nhận chọn assessment nào trong draft AI được phép lưu vào lesson. */
@Data
public class AiAssessmentApplyRequest {
    private Boolean applyQuiz;
    private Boolean applyAssignment;

    /** Bắt buộc lưu tối thiểu một assessment để tránh confirm rỗng. */
    @AssertTrue(message = "Cần chọn applyQuiz hoặc applyAssignment")
    public boolean isAnyAssessmentSelected() {
        return Boolean.TRUE.equals(applyQuiz) || Boolean.TRUE.equals(applyAssignment);
    }
}
