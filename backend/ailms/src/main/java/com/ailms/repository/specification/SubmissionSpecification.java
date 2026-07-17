package com.ailms.repository.specification;

import com.ailms.entity.SubmissionEntity;
import com.ailms.common.util.SpecificationBuilder;
import com.ailms.request.SubmissionSearchRequest;
import org.springframework.data.jpa.domain.Specification;

public final class SubmissionSpecification {

    private SubmissionSpecification() {
    }

    public static Specification<SubmissionEntity> filterAndSearch(SubmissionSearchRequest request) {
        SpecificationBuilder<SubmissionEntity> builder = SpecificationBuilder.of();

        if (request == null) {
            return builder.build();
        }

        builder.equalIfPresent("status", request.getStatus());
        builder.greaterOrEqualIfPresent("createdAt", request.getCreatedFrom());
        builder.lessOrEqualIfPresent("createdAt", request.getCreatedTo());

        return builder.build();
    }
}
