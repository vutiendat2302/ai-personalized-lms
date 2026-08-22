package com.ailms.request;

import com.ailms.entity.enums.ReviewStatusEnum;
import lombok.*;

import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = false)
public class ReviewSearchRequest extends CommonSearchRequest<ReviewStatusEnum> {
    private Long courseId;
    private Integer rating;

    @Override
    protected List<String> allowedSortFields() {
        return List.of("id", "createdAt", "updatedAt", "rating", "status", "courseId", "userId");
    }
}
