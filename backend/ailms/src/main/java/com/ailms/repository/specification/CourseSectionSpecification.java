package com.ailms.repository.specification;

import com.ailms.entity.CourseSectionEntity;
import com.ailms.common.util.SpecificationBuilder;
import com.ailms.request.CourseSectionSearchRequest;
import org.springframework.data.jpa.domain.Specification;

public final class CourseSectionSpecification {

    private CourseSectionSpecification() {
    }

    public static Specification<CourseSectionEntity> filterAndSearch(CourseSectionSearchRequest request) {
        SpecificationBuilder<CourseSectionEntity> builder = SpecificationBuilder.of();

        if (request == null) {
            return builder.build();
        }

        builder.likeIfPresent("name", request.getKeyword());
        builder.greaterOrEqualIfPresent("createdAt", request.getCreatedFrom());
        builder.lessOrEqualIfPresent("createdAt", request.getCreatedTo());

        return builder.build();
    }
}
