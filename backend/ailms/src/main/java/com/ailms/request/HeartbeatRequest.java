package com.ailms.request;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HeartbeatRequest {

    /**
     * Số giây hoạt động được cộng thêm vào session mỗi lần gửi heartbeat.
     */
    @Builder.Default
    private int activeSecondsIncrement = 30;

    /**
     * Xác định xem người dùng có tương tác với ứng dụng trong khoảng thời gian
     * vừa qua hay không.
     */
    @Builder.Default
    private boolean userInteractionOccurred = true;
}
