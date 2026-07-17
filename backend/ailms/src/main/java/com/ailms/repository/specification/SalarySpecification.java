package com.ailms.repository.specification;

import com.ailms.entity.SalaryEntity;
import com.ailms.common.util.SpecificationBuilder;
import com.ailms.request.SalarySearchRequest;
import org.springframework.data.jpa.domain.Specification;

public final class SalarySpecification {

    private SalarySpecification() {
    }

    public static Specification<SalaryEntity> filterAndSearch(SalarySearchRequest request) {
        SpecificationBuilder<SalaryEntity> builder = SpecificationBuilder.of();

        if (request == null) {
            return builder.build();
        }

        builder.likeIfPresent("employee.employeeCode", request.getKeyword());
        builder.greaterOrEqualIfPresent("createdAt", request.getCreatedFrom());
        builder.lessOrEqualIfPresent("createdAt", request.getCreatedTo());

        return builder.build();
    }
}
