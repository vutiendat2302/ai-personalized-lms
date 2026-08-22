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

        // LIKE %keyword% trên toàn bộ thông tin thường dùng, không chỉ riêng mã NV.
        builder.likeAnyIfPresent(request.getKeyword(),
                "employee.employeeCode",
                "employee.userEntity.fullName",
                "employee.userEntity.email",
                "employee.department.name",
                "employee.position");
        builder.greaterOrEqualIfPresent("createdAt", request.getCreatedFrom());
        builder.lessOrEqualIfPresent("createdAt", request.getCreatedTo());

        return builder.build();
    }
}
