package com.ailms.repository.specification;

import com.ailms.entity.CourseProgressEntity;
import com.ailms.common.util.SpecificationBuilder;
import com.ailms.request.CourseProgressSearchRequest;
import org.springframework.data.jpa.domain.Specification;

public final class CourseProgressSpecification {

    private CourseProgressSpecification() {
    }

    public static Specification<CourseProgressEntity> filterAndSearch(CourseProgressSearchRequest request) {
        SpecificationBuilder<CourseProgressEntity> builder = SpecificationBuilder.of();

        if (request == null) {
            return builder.build();
        }

        builder.greaterOrEqualIfPresent("createdAt", request.getCreatedFrom());
        builder.lessOrEqualIfPresent("createdAt", request.getCreatedTo());

        return builder.build();
    }
}
