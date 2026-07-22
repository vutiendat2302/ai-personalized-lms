package com.ailms.repository.specification;

import com.ailms.entity.QuizAttemptEntity;
import com.ailms.common.util.SpecificationBuilder;
import com.ailms.request.QuizAttemptSearchRequest;
import org.springframework.data.jpa.domain.Specification;

public final class QuizAttemptSpecification {

    private QuizAttemptSpecification() {
    }

    public static Specification<QuizAttemptEntity> filterAndSearch(QuizAttemptSearchRequest request) {
        SpecificationBuilder<QuizAttemptEntity> builder = SpecificationBuilder.of();

        if (request == null) {
            return builder.build();
        }

        builder.equalIfPresent("status", request.getStatus());
        builder.greaterOrEqualIfPresent("createdAt", request.getCreatedFrom());
        builder.lessOrEqualIfPresent("createdAt", request.getCreatedTo());

        return builder.build();
    }
}
