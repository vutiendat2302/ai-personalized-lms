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

        builder.likeAnyIfPresent(request.getKeyword(), "name");
        builder.equalIfPresent("status", request.getStatus());
        builder.equalIfPresent("categoryEntity.id", request.getCategoryId());
        builder.equalIfPresent("level", request.getLevel());
        builder.equalIfPresent("createdBy", request.getCreatedBy());
        builder.greaterOrEqualIfPresent("createdAt", request.getCreatedFrom());
        builder.lessOrEqualIfPresent("createdAt", request.getCreatedTo());

        return builder.build();
    }
}
