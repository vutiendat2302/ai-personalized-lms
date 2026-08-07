package com.ailms.request;

import com.ailms.entity.enums.BaseStatusEnum;
import com.ailms.entity.enums.FileTypeEnum;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.*;
import java.time.LocalDateTime;

import com.ailms.entity.enums.FileUsageTypeEnum;
import org.springframework.format.annotation.DateTimeFormat;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(callSuper = false)
public class FileSearchRequest extends CommonSearchRequest<BaseStatusEnum> {
    private FileTypeEnum fileType;
    private FileUsageTypeEnum usageType;
    private Boolean isOrphaned;
    private Long createdBy;
    private Long minSize;
    private Long maxSize;

    @DateTimeFormat(pattern = "yyyy-MM-dd['T'HH:mm[:ss]]")
    private LocalDateTime startDate;

    @DateTimeFormat(pattern = "yyyy-MM-dd['T'HH:mm[:ss]]")
    private LocalDateTime endDate;
}
