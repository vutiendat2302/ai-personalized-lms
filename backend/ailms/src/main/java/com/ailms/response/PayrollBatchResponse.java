package com.ailms.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.YearMonth;
import java.time.LocalDateTime;

/** Tổng quan một bảng lương tháng; các salary bên trong là phiếu lương nhân viên. */
@Data
@Builder
public class PayrollBatchResponse {
    private String id;
    private YearMonth period;
    private String status;
    private long slipCount;
    private long draftCount;
    private long pendingCount;
    private long confirmedCount;
    private long transferExportedCount;
    private long paidCount;
    private BigDecimal totalAmount;
    private String rejectionReason;
    private LocalDateTime submittedAt;
    private LocalDateTime approvedAt;
    /** Người tạo bảng lương; dùng String để giữ nguyên Snowflake ID khi sang frontend. */
    private String createdBy;
}
