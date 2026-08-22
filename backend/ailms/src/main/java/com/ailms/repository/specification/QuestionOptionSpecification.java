package com.ailms.repository.specification;

import com.ailms.entity.QuestionOptionEntity;
import com.ailms.common.util.SpecificationBuilder;
import com.ailms.request.QuestionOptionSearchRequest;
import org.springframework.data.jpa.domain.Specification;

public final class QuestionOptionSpecification {

    private QuestionOptionSpecification() {
    }

    public static Specification<QuestionOptionEntity> filterAndSearch(QuestionOptionSearchRequest request) {
        SpecificationBuilder<QuestionOptionEntity> builder = SpecificationBuilder.of();

        if (request == null) {
            return builder.build();
        }

        builder.greaterOrEqualIfPresent("createdAt", request.getCreatedFrom());
        builder.lessOrEqualIfPresent("createdAt", request.getCreatedTo());

        return builder.build();
    }
}
