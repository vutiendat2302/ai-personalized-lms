package com.ailms.repository.specification;

import com.ailms.entity.StudentProfileEntity;
import com.ailms.common.util.SpecificationBuilder;
import com.ailms.request.StudentProfileSearchRequest;
import org.springframework.data.jpa.domain.Specification;

public final class StudentProfileSpecification {

    private StudentProfileSpecification() {
    }

    public static Specification<StudentProfileEntity> filterAndSearch(StudentProfileSearchRequest request) {
        SpecificationBuilder<StudentProfileEntity> builder = SpecificationBuilder.of();

        if (request == null) {
            return builder.build();
        }

        builder.equalIfPresent("userId", request.getUserId());
        builder.greaterOrEqualIfPresent("createdAt", request.getCreatedFrom());
        builder.lessOrEqualIfPresent("createdAt", request.getCreatedTo());

        return builder.build();
    }
}
