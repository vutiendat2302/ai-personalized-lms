package com.ailms.repository.specification;

import com.ailms.entity.EmployeeContractEntity;
import com.ailms.common.util.SpecificationBuilder;
import com.ailms.request.EmployeeContractSearchRequest;
import org.springframework.data.jpa.domain.Specification;

public final class EmployeeContractSpecification {

    private EmployeeContractSpecification() {
    }

    public static Specification<EmployeeContractEntity> filterAndSearch(EmployeeContractSearchRequest request) {
        SpecificationBuilder<EmployeeContractEntity> builder = SpecificationBuilder.of();

        if (request == null) {
            return builder.build();
        }

        builder.likeIfPresent("employee.employeeCode", request.getKeyword());
        builder.greaterOrEqualIfPresent("createdAt", request.getCreatedFrom());
        builder.lessOrEqualIfPresent("createdAt", request.getCreatedTo());

        return builder.build();
    }
}
