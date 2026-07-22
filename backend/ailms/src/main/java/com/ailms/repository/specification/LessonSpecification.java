package com.ailms.repository.specification;

import com.ailms.entity.LessonEntity;
import com.ailms.common.util.SpecificationBuilder;
import com.ailms.request.LessonSearchRequest;
import org.springframework.data.jpa.domain.Specification;

public final class LessonSpecification {

    private LessonSpecification() {
    }

    public static Specification<LessonEntity> filterAndSearch(LessonSearchRequest request) {
        SpecificationBuilder<LessonEntity> builder = SpecificationBuilder.of();

        if (request == null) {
            return builder.build();
        }

        builder.likeIfPresent("name", request.getKeyword());
        builder.greaterOrEqualIfPresent("createdAt", request.getCreatedFrom());
        builder.lessOrEqualIfPresent("createdAt", request.getCreatedTo());

        return builder.build();
    }
}
