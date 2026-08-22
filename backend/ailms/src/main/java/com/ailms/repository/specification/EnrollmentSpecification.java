package com.ailms.repository.specification;

import com.ailms.entity.EnrollmentEntity;
import com.ailms.common.util.SpecificationBuilder;
import com.ailms.request.EnrollmentSearchRequest;
import org.springframework.data.jpa.domain.Specification;

public final class EnrollmentSpecification {

    private EnrollmentSpecification() {
    }

    public static Specification<EnrollmentEntity> filterAndSearch(EnrollmentSearchRequest request) {
        SpecificationBuilder<EnrollmentEntity> builder = SpecificationBuilder.of();

        if (request == null) {
            return builder.build();
        }

        builder.equalIfPresent("status", request.getStatus());
        builder.greaterOrEqualIfPresent("createdAt", request.getCreatedFrom());
        builder.lessOrEqualIfPresent("createdAt", request.getCreatedTo());

        return builder.build();
    }
}
