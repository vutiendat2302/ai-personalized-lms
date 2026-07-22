package com.ailms.request;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
public abstract class CommonSearchRequest<S> extends BaseSearchRequest {
    private String keyword;
    private S status;              // generic theo enum status riêng từng entity
    private LocalDateTime createdFrom;
    private LocalDateTime createdTo;
}
