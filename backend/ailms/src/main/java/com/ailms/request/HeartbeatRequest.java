package com.ailms.request;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HeartbeatRequest {

    @Builder.Default
    private int activeSecondsIncrement = 30;

    @Builder.Default
    private boolean userInteractionOccurred = true;
}
