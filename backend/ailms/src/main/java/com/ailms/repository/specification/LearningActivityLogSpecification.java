package com.ailms.repository.specification;

import com.ailms.entity.LearningActivityLogEntity;
import com.ailms.common.util.SpecificationBuilder;
import com.ailms.request.LearningActivityLogSearchRequest;
import org.springframework.data.jpa.domain.Specification;

public final class LearningActivityLogSpecification {

    private LearningActivityLogSpecification() {
    }

    public static Specification<LearningActivityLogEntity> filterAndSearch(LearningActivityLogSearchRequest request) {
        SpecificationBuilder<LearningActivityLogEntity> builder = SpecificationBuilder.of();

        if (request == null) {
            return builder.build();
        }

        builder.greaterOrEqualIfPresent("createdAt", request.getCreatedFrom());
        builder.lessOrEqualIfPresent("createdAt", request.getCreatedTo());

        return builder.build();
    }
}
