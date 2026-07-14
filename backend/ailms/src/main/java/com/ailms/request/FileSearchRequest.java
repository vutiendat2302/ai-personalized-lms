package com.ailms.request;

import com.ailms.entity.BaseStatusEnum;
import com.ailms.entity.FileTypeEnum;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(callSuper = false) // Khong so sanh in hoa voi in thuong
public class FileSearchRequest extends BaseSearchRequest {
    private String keyword;

    private List<FileTypeEnum> fileTypes;

    private List<BaseStatusEnum> statuses;

    private String contentType;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdFrom;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdTo;
}
