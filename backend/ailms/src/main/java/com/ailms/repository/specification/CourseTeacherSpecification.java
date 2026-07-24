package com.ailms.repository.specification;

import com.ailms.entity.CourseTeacherEntity;
import com.ailms.common.util.SpecificationBuilder;
import com.ailms.request.CourseTeacherSearchRequest;
import org.springframework.data.jpa.domain.Specification;

public final class CourseTeacherSpecification {

    private CourseTeacherSpecification() {
    }

    public static Specification<CourseTeacherEntity> filterAndSearch(CourseTeacherSearchRequest request) {
        SpecificationBuilder<CourseTeacherEntity> builder = SpecificationBuilder.of();

        if (request == null) {
            return builder.build();
        }

        builder.greaterOrEqualIfPresent("createdAt", request.getCreatedFrom());
        builder.lessOrEqualIfPresent("createdAt", request.getCreatedTo());

        return builder.build();
    }
}
