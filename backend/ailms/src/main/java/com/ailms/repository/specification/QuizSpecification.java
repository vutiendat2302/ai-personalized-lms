package com.ailms.repository.specification;

import com.ailms.entity.QuizEntity;
import com.ailms.common.util.SpecificationBuilder;
import com.ailms.request.QuizSearchRequest;
import org.springframework.data.jpa.domain.Specification;

public final class QuizSpecification {

    private QuizSpecification() {
    }

    public static Specification<QuizEntity> filterAndSearch(QuizSearchRequest request) {
        SpecificationBuilder<QuizEntity> builder = SpecificationBuilder.of();

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
