package com.ailms.request;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TerminateContractRequest {
    private String terminationReason;
}
