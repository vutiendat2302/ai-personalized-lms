package com.ailms.repository.specification;

import com.ailms.entity.ClassEntity;
import com.ailms.common.util.SpecificationBuilder;
import com.ailms.request.ClassSearchRequest;
import org.springframework.data.jpa.domain.Specification;

public final class ClassSpecification {

    private ClassSpecification() {
    }

    public static Specification<ClassEntity> filterAndSearch(ClassSearchRequest request) {
        SpecificationBuilder<ClassEntity> builder = SpecificationBuilder.of();

        if (request == null) {
            return builder.build();
        }

        builder.likeIfPresent("name", request.getKeyword());
        builder.equalIfPresent("status", request.getStatus());
        builder.greaterOrEqualIfPresent("createdAt", request.getCreatedFrom());
        builder.lessOrEqualIfPresent("createdAt", request.getCreatedTo());

        return builder.build();
    }
}
