package com.ailms.repository.specification;

import com.ailms.entity.AssignmentEntity;
import com.ailms.common.util.SpecificationBuilder;
import com.ailms.request.AssignmentSearchRequest;
import org.springframework.data.jpa.domain.Specification;

public final class AssignmentSpecification {

    private AssignmentSpecification() {
    }

    public static Specification<AssignmentEntity> filterAndSearch(AssignmentSearchRequest request) {
        SpecificationBuilder<AssignmentEntity> builder = SpecificationBuilder.of();

        if (request == null) {
            return builder.build();
        }

        builder.likeIfPresent("title", request.getKeyword());
        builder.equalIfPresent("status", request.getStatus());
        builder.greaterOrEqualIfPresent("createdAt", request.getCreatedFrom());
        builder.lessOrEqualIfPresent("createdAt", request.getCreatedTo());

        return builder.build();
    }
}
