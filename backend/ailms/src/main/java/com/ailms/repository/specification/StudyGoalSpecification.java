package com.ailms.repository.specification;

import com.ailms.entity.StudyGoalEntity;
import com.ailms.common.util.SpecificationBuilder;
import com.ailms.request.StudyGoalSearchRequest;
import org.springframework.data.jpa.domain.Specification;

public final class StudyGoalSpecification {

    private StudyGoalSpecification() {
    }

    public static Specification<StudyGoalEntity> filterAndSearch(StudyGoalSearchRequest request) {
        SpecificationBuilder<StudyGoalEntity> builder = SpecificationBuilder.of();

        if (request == null) {
            return builder.build();
        }

        builder.greaterOrEqualIfPresent("createdAt", request.getCreatedFrom());
        builder.lessOrEqualIfPresent("createdAt", request.getCreatedTo());

        return builder.build();
    }
}
