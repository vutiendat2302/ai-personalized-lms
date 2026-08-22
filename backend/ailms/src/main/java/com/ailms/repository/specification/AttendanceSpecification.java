package com.ailms.repository.specification;

import com.ailms.entity.AttendanceEntity;
import com.ailms.entity.DepartmentEntity;
import com.ailms.entity.EmployeeEntity;
import com.ailms.entity.UserEntity;
import com.ailms.entity.WorkShiftEntity;
import com.ailms.request.AttendanceSearchRequest;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;

public final class AttendanceSpecification {

    private AttendanceSpecification() {
    }

    public static Specification<AttendanceEntity> filterAndSearch(AttendanceSearchRequest request) {
        return (root, query, cb) -> {
            if (request == null) {
                return cb.conjunction();
            }

            List<Predicate> predicates = new ArrayList<>();

            if (request.getKeyword() != null && !request.getKeyword().isBlank()) {
                String kw = "%" + request.getKeyword().trim().toLowerCase() + "%";
                Join<AttendanceEntity, EmployeeEntity> employeeJoin = root.join("employee", JoinType.LEFT);
                Join<EmployeeEntity, UserEntity> userJoin = employeeJoin.join("userEntity", JoinType.LEFT);

                Predicate codePredicate = cb.like(cb.lower(employeeJoin.get("employeeCode")), kw);
                Predicate namePredicate = cb.like(cb.lower(userJoin.get("fullName")), kw);
                predicates.add(cb.or(codePredicate, namePredicate));
            }

            if (request.getWorkDateFrom() != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("workDate"), request.getWorkDateFrom()));
            }

            if (request.getWorkDateTo() != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("workDate"), request.getWorkDateTo()));
            }

            if (request.getStatus() != null) {
                predicates.add(cb.equal(root.get("status"), request.getStatus()));
            }

            if (request.getSource() != null) {
                predicates.add(cb.equal(root.get("source"), request.getSource()));
            }

            if (request.getWorkShiftId() != null) {
                Join<AttendanceEntity, WorkShiftEntity> shiftJoin = root.join("workShift", JoinType.LEFT);
                predicates.add(cb.equal(shiftJoin.get("id"), request.getWorkShiftId()));
            }

            if (request.getDepartmentId() != null) {
                Join<AttendanceEntity, EmployeeEntity> empJoin = root.join("employee", JoinType.LEFT);
                Join<EmployeeEntity, DepartmentEntity> deptJoin = empJoin.join("department", JoinType.LEFT);
                predicates.add(cb.equal(deptJoin.get("id"), request.getDepartmentId()));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}

