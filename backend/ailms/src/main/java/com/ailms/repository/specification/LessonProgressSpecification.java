package com.ailms.repository.specification;

import com.ailms.entity.LessonProgressEntity;
import com.ailms.common.util.SpecificationBuilder;
import com.ailms.request.LessonProgressSearchRequest;
import org.springframework.data.jpa.domain.Specification;

public final class LessonProgressSpecification {

    private LessonProgressSpecification() {
    }

    public static Specification<LessonProgressEntity> filterAndSearch(LessonProgressSearchRequest request) {
        SpecificationBuilder<LessonProgressEntity> builder = SpecificationBuilder.of();

        if (request == null) {
            return builder.build();
        }

        builder.equalIfPresent("status", request.getStatus());
        builder.greaterOrEqualIfPresent("createdAt", request.getCreatedFrom());
        builder.lessOrEqualIfPresent("createdAt", request.getCreatedTo());

        return builder.build();
    }
}
