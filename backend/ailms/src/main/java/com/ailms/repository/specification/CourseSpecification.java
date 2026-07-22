package com.ailms.repository.specification;

import com.ailms.entity.CourseEntity;
import com.ailms.common.util.SpecificationBuilder;
import com.ailms.request.CourseSearchRequest;
import org.springframework.data.jpa.domain.Specification;

public class CourseSpecification {

    public static Specification<CourseEntity> filterAndSearch(CourseSearchRequest request) {
        SpecificationBuilder<CourseEntity> builder = SpecificationBuilder.of();

        if (request == null) {
            return builder.build();
        }

        builder.likeAnyIfPresent(request.getKeyword(), "name", "description");
        builder.equalIfPresent("status", request.getStatus());
        builder.greaterOrEqualIfPresent("createdAt", request.getCreatedFrom());
        builder.lessOrEqualIfPresent("createdAt", request.getCreatedTo());

        return builder.build();
    }
}
