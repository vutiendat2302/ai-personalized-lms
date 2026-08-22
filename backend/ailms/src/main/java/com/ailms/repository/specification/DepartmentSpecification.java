package com.ailms.repository.specification;

import com.ailms.entity.DepartmentEntity;
import com.ailms.entity.EmployeeEntity;
import com.ailms.entity.enums.EmployeeStatusEnum;
import com.ailms.entity.enums.UserStatusEnum;
import com.ailms.request.DepartmentSearchRequest;
import com.ailms.common.util.SpecificationBuilder;
import jakarta.persistence.criteria.Subquery;
import org.springframework.data.jpa.domain.Specification;

public final class DepartmentSpecification {

    private DepartmentSpecification() {
    }

    public static Specification<DepartmentEntity> filterAndSearch(DepartmentSearchRequest request) {
        return filterAndSearch(request, null);
    }

    public static Specification<DepartmentEntity> filterAndSearch(DepartmentSearchRequest request, String employeeCountSortDir) {
        SpecificationBuilder<DepartmentEntity> builder = SpecificationBuilder.of();

        if (request != null) {
            builder.likeAnyIfPresent(request.getKeyword(), "code", "name", "description");
            builder.equalIfPresent("status", request.getStatus());
            builder.greaterOrEqualIfPresent("createdAt", request.getCreatedFrom());
            builder.lessOrEqualIfPresent("createdAt", request.getCreatedTo());

            // Filter hasEmployees: true = có nhân viên, false = không có nhân viên
            if (request.getHasEmployees() != null) {
                builder.custom((root, query, cb) -> {
                    Subquery<Long> sub = query.subquery(Long.class);
                    var empRoot = sub.from(EmployeeEntity.class);
                    var userJoin = empRoot.join("userEntity");
                    sub.select(empRoot.get("id"))
                       .where(cb.and(
                           cb.equal(empRoot.get("department").get("id"), root.get("id")),
                           cb.notEqual(empRoot.get("status"), EmployeeStatusEnum.TERMINATED),
                           cb.notEqual(userJoin.get("status"), UserStatusEnum.DELETED)
                       ));
                    if (Boolean.TRUE.equals(request.getHasEmployees())) {
                        return cb.exists(sub);
                    } else {
                        return cb.not(cb.exists(sub));
                    }
                });
            }
        }

        if (employeeCountSortDir != null) {
            builder.custom((root, query, cb) -> {
                if (Long.class != query.getResultType() && long.class != query.getResultType()) {
                    Subquery<Long> countSub = query.subquery(Long.class);
                    var empRoot = countSub.from(EmployeeEntity.class);
                    var userJoin = empRoot.join("userEntity");
                    countSub.select(cb.count(empRoot))
                            .where(cb.and(
                                    cb.equal(empRoot.get("department").get("id"), root.get("id")),
                                    cb.notEqual(empRoot.get("status"), EmployeeStatusEnum.TERMINATED),
                                    cb.notEqual(userJoin.get("status"), UserStatusEnum.DELETED) // đổi tên enum đúng theo hệ thống của m
                            ));

                    if ("ASC".equalsIgnoreCase(employeeCountSortDir)) {
                        query.orderBy(cb.asc(countSub));
                    } else {
                        query.orderBy(cb.desc(countSub));
                    }
                }
                return cb.conjunction();
            });
        }

        return builder.build();
    }
}
