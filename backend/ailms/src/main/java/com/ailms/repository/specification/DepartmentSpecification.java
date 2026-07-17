package com.ailms.repository.specification;

import com.ailms.entity.DepartmentEntity;
import com.ailms.request.DepartmentSearchRequest;
import com.ailms.common.util.SpecificationBuilder;
import org.springframework.data.jpa.domain.Specification;

public final class DepartmentSpecification {

    private DepartmentSpecification() {
    }

    public static Specification<DepartmentEntity> filterAndSearch(DepartmentSearchRequest request) {
        SpecificationBuilder<DepartmentEntity> builder = SpecificationBuilder.of();

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
