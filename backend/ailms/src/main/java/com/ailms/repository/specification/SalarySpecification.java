package com.ailms.repository.specification;

import com.ailms.entity.DepartmentEntity;
import com.ailms.entity.EmployeeEntity;
import com.ailms.entity.SalaryEntity;
import com.ailms.entity.UserEntity;
import com.ailms.request.SalarySearchRequest;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;

public final class SalarySpecification {

    private SalarySpecification() {
    }

    public static Specification<SalaryEntity> filterAndSearch(SalarySearchRequest request) {
        return (root, query, cb) -> {
            if (request == null) {
                return cb.conjunction();
            }

            List<Predicate> predicates = new ArrayList<>();

            if (request.getKeyword() != null && !request.getKeyword().isBlank()) {
                String kw = "%" + request.getKeyword().trim().toLowerCase() + "%";
                Join<SalaryEntity, EmployeeEntity> employeeJoin = root.join("employee", JoinType.LEFT);
                Join<EmployeeEntity, UserEntity> userJoin = employeeJoin.join("userEntity", JoinType.LEFT);

                Predicate codePredicate = cb.like(cb.lower(employeeJoin.get("employeeCode")), kw);
                Predicate namePredicate = cb.like(cb.lower(userJoin.get("fullName")), kw);
                predicates.add(cb.or(codePredicate, namePredicate));
            }

            if (request.getPeriod() != null) {
                predicates.add(cb.equal(root.get("period"), request.getPeriod()));
            }

            if (request.getStatus() != null) {
                predicates.add(cb.equal(root.get("status"), request.getStatus()));
            }

            if (request.getSalaryTypeEnum() != null) {
                predicates.add(cb.equal(root.get("salaryTypeEnum"), request.getSalaryTypeEnum()));
            }

            if (request.getDepartmentId() != null) {
                Join<SalaryEntity, EmployeeEntity> empJoin = root.join("employee", JoinType.LEFT);
                Join<EmployeeEntity, DepartmentEntity> deptJoin = empJoin.join("department", JoinType.LEFT);
                predicates.add(cb.equal(deptJoin.get("id"), request.getDepartmentId()));
            }

            if (request.getCreatedFrom() != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), request.getCreatedFrom()));
            }

            if (request.getCreatedTo() != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"), request.getCreatedTo()));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
