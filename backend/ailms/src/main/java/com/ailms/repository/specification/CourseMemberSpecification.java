package com.ailms.repository.specification;

import com.ailms.entity.CourseMemberEntity;
import com.ailms.common.util.SpecificationBuilder;
import com.ailms.request.CourseMemberSearchRequest;
import org.springframework.data.jpa.domain.Specification;

public final class CourseMemberSpecification {

    private CourseMemberSpecification() {
    }

    public static Specification<CourseMemberEntity> filterAndSearch(CourseMemberSearchRequest request) {
        SpecificationBuilder<CourseMemberEntity> builder = SpecificationBuilder.of();

        if (request == null) {
            return builder.build();
        }

        builder.greaterOrEqualIfPresent("createdAt", request.getCreatedFrom());
        builder.lessOrEqualIfPresent("createdAt", request.getCreatedTo());

        return builder.build();
    }
}
