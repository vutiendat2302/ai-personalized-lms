package com.ailms.response;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/** Dữ liệu lịch sử hoạt động an toàn để học viên tự xem. */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentActivityHistoryResponse {
    private Long id;
    private String historyType;
    private String action;
    private String entityType;
    private Long entityId;
    private String entityName;
    private String metadata;
    private String device;
    private String ipAddress;
    private String userAgent;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime occurredAt;
}
