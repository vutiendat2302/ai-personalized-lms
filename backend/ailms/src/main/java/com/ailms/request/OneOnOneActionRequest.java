package com.ailms.request;

import lombok.*;

/** Ghi chú nghiệp vụ cho thao tác HR cancel/refund. */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OneOnOneActionRequest {
    private String reason;
}
