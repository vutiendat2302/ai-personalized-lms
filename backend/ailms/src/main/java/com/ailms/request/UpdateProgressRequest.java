package com.ailms.request;

import lombok.*;

/**
 * Request cập nhật tiến độ bài học từ học viên.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateProgressRequest {

    /** Phần trăm xem video (0 - 100). */
    private Integer watchPercent;

    /** Vị trí tạm dừng xem (tính bằng giây). */
    private Integer lastPositionSec;

    /** Tổng thời gian học (tính bằng giây). */
    private Integer timeSpentSec;

    /** Đánh dấu hoàn thành bài học thủ công (dành cho TEXT/PDF). */
    private Boolean markCompleted;
}
