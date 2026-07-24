package com.ailms.repository.specification;

import com.ailms.entity.AttendanceEntity;
import com.ailms.common.util.SpecificationBuilder;
import com.ailms.request.AttendanceSearchRequest;
import org.springframework.data.jpa.domain.Specification;

public final class AttendanceSpecification {

    private AttendanceSpecification() {
    }

    public static Specification<AttendanceEntity> filterAndSearch(AttendanceSearchRequest request) {
        SpecificationBuilder<AttendanceEntity> builder = SpecificationBuilder.of();

        if (request == null) {
            return builder.build();
        }

        builder.likeIfPresent("employee.employeeCode", request.getKeyword());
        builder.greaterOrEqualIfPresent("createdAt", request.getCreatedFrom());
        builder.lessOrEqualIfPresent("createdAt", request.getCreatedTo());

        return builder.build();
    }
}
