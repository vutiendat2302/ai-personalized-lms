package com.ailms.request;

import com.ailms.entity.enums.BaseStatusEnum;
import lombok.*;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(callSuper = false)
public class ClassOnlineSearchRequest extends CommonSearchRequest<BaseStatusEnum> {
    private String keyword;
    private Long classId;
    private String lifecycleStatus;

    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
    private LocalDateTime scheduledFrom;

    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
    private LocalDateTime scheduledTo;
}
