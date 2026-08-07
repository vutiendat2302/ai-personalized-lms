package com.ailms.repository.specification;

import com.ailms.common.util.SpecificationBuilder;
import com.ailms.entity.DepartmentEntity;
import com.ailms.entity.EmployeeEntity;
import com.ailms.entity.SalaryEntity;
import com.ailms.entity.UserEntity;
import com.ailms.request.SalarySearchRequest;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

public final class SalarySpecification {

    private SalarySpecification() {
    }

    public static Specification<SalaryEntity> filterAndSearch(SalarySearchRequest request) {
        SpecificationBuilder<SalaryEntity> builder = SpecificationBuilder.of();
        builder.custom((root, ignoredQuery, cb) -> cb.isNull(root.get("deletedAt")));

        if (request == null) {
            return builder.build();
        }

        if (request.getKeyword() != null && !request.getKeyword().isBlank()) {
            String keywordPattern = "%" + request.getKeyword().trim().toLowerCase() + "%";
            builder.custom((root, ignoredQuery, cb) -> {
                Join<SalaryEntity, EmployeeEntity> employee = root.join("employee", JoinType.LEFT);
                Join<EmployeeEntity, UserEntity> user = employee.join("userEntity", JoinType.LEFT);
                Predicate employeeCode = cb.like(cb.lower(employee.get("employeeCode")), keywordPattern);
                Predicate fullName = cb.like(cb.lower(user.get("fullName")), keywordPattern);
                return cb.or(employeeCode, fullName);
            });
        }

        if (request.getPeriod() != null) {
            builder.equalIfPresent("period", request.getPeriod());
        } else {
            builder.greaterOrEqualIfPresent("period", request.getPeriodFrom());
            builder.lessOrEqualIfPresent("period", request.getPeriodTo());
        }

        builder.equalIfPresent("status", request.getStatus());
        builder.equalIfPresent("salaryTypeEnum", request.getSalaryTypeEnum());
        builder.greaterOrEqualIfPresent("createdAt", request.getCreatedFrom());
        builder.lessOrEqualIfPresent("createdAt", request.getCreatedTo());

        if (request.getDepartmentId() != null) {
            builder.custom((root, ignoredQuery, cb) -> {
                Join<SalaryEntity, EmployeeEntity> employee = root.join("employee", JoinType.LEFT);
                Join<EmployeeEntity, DepartmentEntity> department = employee.join("department", JoinType.LEFT);
                return cb.equal(department.get("id"), request.getDepartmentId());
            });
        }

        return builder.build();
    }
}
