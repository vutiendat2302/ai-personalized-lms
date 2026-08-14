package com.ailms.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** Kết quả kiểm tra trước lịch học 1-1 mà chưa tạo đơn hàng. */
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TutorScheduleCheckResponse {
    private boolean conflict;
    private String message;
}
