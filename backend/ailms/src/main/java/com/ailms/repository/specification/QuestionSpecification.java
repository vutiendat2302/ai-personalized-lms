package com.ailms.repository.specification;

import com.ailms.entity.QuestionEntity;
import com.ailms.common.util.SpecificationBuilder;
import com.ailms.request.QuestionSearchRequest;
import org.springframework.data.jpa.domain.Specification;

public final class QuestionSpecification {

    private QuestionSpecification() {
    }

    public static Specification<QuestionEntity> filterAndSearch(QuestionSearchRequest request) {
        SpecificationBuilder<QuestionEntity> builder = SpecificationBuilder.of();

        if (request == null) {
            return builder.build();
        }

        builder.equalIfPresent("status", request.getStatus());
        builder.greaterOrEqualIfPresent("createdAt", request.getCreatedFrom());
        builder.lessOrEqualIfPresent("createdAt", request.getCreatedTo());

        return builder.build();
    }
}
