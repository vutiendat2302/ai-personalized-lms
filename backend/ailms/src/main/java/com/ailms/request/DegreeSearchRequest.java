package com.ailms.request;

import com.ailms.entity.enums.DegreeTypeEnum;
import com.ailms.entity.enums.BaseStatusEnum;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(callSuper = false)
public class DegreeSearchRequest extends BaseSearchRequest {
    private Long categoryId;
    private DegreeTypeEnum type;
    private BaseStatusEnum status;
    private String keyword;
}
