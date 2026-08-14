package com.ailms.request;

import com.ailms.entity.enums.LeaveTypeEnum;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

/** Nhóm DTO đầu vào dành cho các thao tác trong workspace người dạy. */
public final class TeacherWorkspaceRequest {

    /** Không cho khởi tạo class chỉ dùng làm namespace DTO. */
    private TeacherWorkspaceRequest() {
    }

    /** Nội dung nhận xét sau buổi học. */
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class SessionReview {
        @NotBlank @Size(max = 10000)
        private String note;
        @Size(max = 10000)
        private String summary;
        @Size(max = 10000)
        private String nextSessionNotes;
        private Integer actualDurationMin;
    }

    /** Điểm và nhận xét cho một bài nộp assignment. */
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class SubmissionGrade {
        @NotNull @DecimalMin("0.0")
        private BigDecimal score;
        @Size(max = 10000)
        private String feedback;
    }

    /** Điểm chấm tay cho một câu trả lời quiz. */
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class AnswerGrade {
        @NotNull @DecimalMin("0.0")
        private BigDecimal points;
        private Boolean correct;
    }

    /** Yêu cầu nghiệp vụ tổng quát gửi HR/Admin phê duyệt. */
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class WorkRequestCreate {
        @NotBlank @Size(max = 50)
        private String type;
        private Long targetId;
        @NotBlank @Size(max = 1000)
        private String reason;
    }

    /** Đơn nghỉ phép không cho phép client giả mạo employeeId. */
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class LeaveCreate {
        @NotNull
        private LeaveTypeEnum leaveType;
        @NotNull
        private LocalDate startDate;
        @NotNull
        private LocalDate endDate;
        @NotBlank @Size(max = 2000)
        private String reason;
    }

    /** Yêu cầu chuyển phân công từ lớp hiện tại sang lớp đích. */
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ClassTransferCreate {
        @NotNull
        private Long fromClassId;
        @NotNull
        private Long toClassId;
        @NotBlank @Size(max = 1000)
        private String reason;
    }
}
