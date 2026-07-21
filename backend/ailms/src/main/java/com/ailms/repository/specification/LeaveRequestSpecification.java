package com.ailms.repository.specification;

import com.ailms.entity.LeaveRequestEntity;
import com.ailms.request.LeaveRequestSearchRequest;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;

public class LeaveRequestSpecification {

    public static Specification<LeaveRequestEntity> filterAndSearch(LeaveRequestSearchRequest request) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (request == null) {
                return cb.conjunction();
            }

            if (request.getEmployeeId() != null) {
                predicates.add(cb.equal(root.get("employee").get("userId"), request.getEmployeeId()));
            }

            if (request.getStatus() != null) {
                predicates.add(cb.equal(root.get("status"), request.getStatus()));
            }

            if (request.getLeaveType() != null) {
                predicates.add(cb.equal(root.get("leaveType"), request.getLeaveType()));
            }

            if (request.getFromDate() != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("startDate"), request.getFromDate()));
            }

            if (request.getToDate() != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("endDate"), request.getToDate()));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
