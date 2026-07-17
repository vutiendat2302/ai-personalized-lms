package com.ailms.repository.specification;

import com.ailms.entity.GuardianEntity;
import com.ailms.common.util.SpecificationBuilder;
import com.ailms.request.GuardianSearchRequest;
import org.springframework.data.jpa.domain.Specification;

public final class GuardianSpecification {

    private GuardianSpecification() {
    }

    public static Specification<GuardianEntity> filterAndSearch(GuardianSearchRequest request) {
        SpecificationBuilder<GuardianEntity> builder = SpecificationBuilder.of();

        if (request == null) {
            return builder.build();
        }

        builder.greaterOrEqualIfPresent("createdAt", request.getCreatedFrom());
        builder.lessOrEqualIfPresent("createdAt", request.getCreatedTo());

        return builder.build();
    }
}
