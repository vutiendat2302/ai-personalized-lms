package com.ailms.repository.specification;

import com.ailms.entity.InterestEntity;
import com.ailms.common.util.SpecificationBuilder;
import com.ailms.request.InterestSearchRequest;
import org.springframework.data.jpa.domain.Specification;

public final class InterestSpecification {

    private InterestSpecification() {
    }

    public static Specification<InterestEntity> filterAndSearch(InterestSearchRequest request) {
        SpecificationBuilder<InterestEntity> builder = SpecificationBuilder.of();

        if (request == null) {
            return builder.build();
        }

        builder.likeAnyIfPresent(request.getKeyword(), "code", "name");
        builder.equalIfPresent("status", request.getStatus());
        builder.greaterOrEqualIfPresent("createdAt", request.getCreatedFrom());
        builder.lessOrEqualIfPresent("createdAt", request.getCreatedTo());

        return builder.build();
    }
}
