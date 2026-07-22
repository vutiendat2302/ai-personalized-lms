package com.ailms.repository.specification;

import com.ailms.entity.QuizAnswerEntity;
import com.ailms.common.util.SpecificationBuilder;
import com.ailms.request.QuizAnswerSearchRequest;
import org.springframework.data.jpa.domain.Specification;

public final class QuizAnswerSpecification {

    private QuizAnswerSpecification() {
    }

    public static Specification<QuizAnswerEntity> filterAndSearch(QuizAnswerSearchRequest request) {
        SpecificationBuilder<QuizAnswerEntity> builder = SpecificationBuilder.of();

        if (request == null) {
            return builder.build();
        }

        builder.greaterOrEqualIfPresent("createdAt", request.getCreatedFrom());
        builder.lessOrEqualIfPresent("createdAt", request.getCreatedTo());

        return builder.build();
    }
}
