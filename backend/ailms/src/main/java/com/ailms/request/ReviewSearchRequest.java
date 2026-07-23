package com.ailms.request;

import com.ailms.entity.enums.ReviewStatusEnum;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = false)
public class ReviewSearchRequest extends CommonSearchRequest<ReviewStatusEnum> {
    private Long courseId;
    private Integer rating;
}
