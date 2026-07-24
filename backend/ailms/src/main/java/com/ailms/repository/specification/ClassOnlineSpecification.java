package com.ailms.repository.specification;

import com.ailms.entity.ClassOnlineEntity;
import com.ailms.common.util.SpecificationBuilder;
import com.ailms.request.ClassOnlineSearchRequest;
import org.springframework.data.jpa.domain.Specification;

public final class ClassOnlineSpecification {

    private ClassOnlineSpecification() {
    }

    public static Specification<ClassOnlineEntity> filterAndSearch(ClassOnlineSearchRequest request) {
        SpecificationBuilder<ClassOnlineEntity> builder = SpecificationBuilder.of();

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
