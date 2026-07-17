package com.ailms.repository.specification;

import com.ailms.entity.LessonResourceEntity;
import com.ailms.common.util.SpecificationBuilder;
import com.ailms.request.LessonResourceSearchRequest;
import org.springframework.data.jpa.domain.Specification;

public final class LessonResourceSpecification {

    private LessonResourceSpecification() {
    }

    public static Specification<LessonResourceEntity> filterAndSearch(LessonResourceSearchRequest request) {
        SpecificationBuilder<LessonResourceEntity> builder = SpecificationBuilder.of();

        if (request == null) {
            return builder.build();
        }

        builder.likeIfPresent("name", request.getKeyword());
        builder.greaterOrEqualIfPresent("createdAt", request.getCreatedFrom());
        builder.lessOrEqualIfPresent("createdAt", request.getCreatedTo());

        return builder.build();
    }
}
