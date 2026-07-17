package com.ailms.repository.specification;

import com.ailms.entity.EmployeeEntity;
import com.ailms.entity.enums.EmployeeStatusEnum;
import com.ailms.request.EmployeeSearchRequest;
import com.ailms.common.util.SpecificationBuilder;
import org.springframework.data.jpa.domain.Specification;

public final class EmployeeSpecification {

    private EmployeeSpecification() {
    }

    public static Specification<EmployeeEntity> filterAndSearch(EmployeeSearchRequest request) {
        SpecificationBuilder<EmployeeEntity> builder = SpecificationBuilder.of();

        builder.custom((root, query, cb) -> cb.notEqual(root.get("status"), EmployeeStatusEnum.DELETE));

        if (request == null) {
            return builder.build();
        }

        builder.likeAnyIfPresent(request.getKeyword(), "employeeCode", "position", "userEntity.username");
        builder.equalIfPresent("employmentTypeEnum", request.getEmploymentTypeEnum());
        builder.greaterOrEqualIfPresent("startDate", request.getStartDateFrom());
        builder.lessOrEqualIfPresent("endDate", request.getEndDateTo());
        builder.greaterOrEqualIfPresent("createdAt", request.getCreatedFrom());
        builder.lessOrEqualIfPresent("createdAt", request.getCreatedTo());
        builder.equalIfPresent("status", request.getStatus());

        return builder.build();
    }
}
