package com.ailms.repository.specification;

import com.ailms.entity.CategoryEntity;
import com.ailms.common.util.SpecificationBuilder;
import com.ailms.request.CategorySearchRequest;
import org.springframework.data.jpa.domain.Specification;

public final class CategorySpecification {

    private CategorySpecification() {
    }

    public static Specification<CategoryEntity> filterAndSearch(CategorySearchRequest request) {
        SpecificationBuilder<CategoryEntity> builder = SpecificationBuilder.of();

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
