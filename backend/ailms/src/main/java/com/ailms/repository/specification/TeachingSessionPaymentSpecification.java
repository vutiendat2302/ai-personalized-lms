package com.ailms.repository.specification;

import com.ailms.entity.TeachingSessionPaymentEntity;
import com.ailms.common.util.SpecificationBuilder;
import com.ailms.request.TeachingSessionPaymentSearchRequest;
import org.springframework.data.jpa.domain.Specification;

public final class TeachingSessionPaymentSpecification {

    private TeachingSessionPaymentSpecification() {
    }

    public static Specification<TeachingSessionPaymentEntity> filterAndSearch(TeachingSessionPaymentSearchRequest request) {
        SpecificationBuilder<TeachingSessionPaymentEntity> builder = SpecificationBuilder.of();

        if (request == null) {
            return builder.build();
        }

        builder.likeIfPresent("employee.employeeCode", request.getKeyword());
        builder.greaterOrEqualIfPresent("createdAt", request.getCreatedFrom());
        builder.lessOrEqualIfPresent("createdAt", request.getCreatedTo());

        return builder.build();
    }
}
