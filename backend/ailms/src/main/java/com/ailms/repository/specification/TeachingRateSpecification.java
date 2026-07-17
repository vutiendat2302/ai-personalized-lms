package com.ailms.repository.specification;

import com.ailms.entity.TeachingRateEntity;
import com.ailms.common.util.SpecificationBuilder;
import com.ailms.request.TeachingRateSearchRequest;
import org.springframework.data.jpa.domain.Specification;

public final class TeachingRateSpecification {

    private TeachingRateSpecification() {
    }

    public static Specification<TeachingRateEntity> filterAndSearch(TeachingRateSearchRequest request) {
        SpecificationBuilder<TeachingRateEntity> builder = SpecificationBuilder.of();

        if (request == null) {
            return builder.build();
        }

        builder.likeIfPresent("employeeEntity.employeeCode", request.getKeyword());
        builder.equalIfPresent("status", request.getStatus());
        builder.greaterOrEqualIfPresent("createdAt", request.getCreatedFrom());
        builder.lessOrEqualIfPresent("createdAt", request.getCreatedTo());

        return builder.build();
    }
}
