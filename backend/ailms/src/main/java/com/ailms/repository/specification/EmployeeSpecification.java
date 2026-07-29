package com.ailms.repository.specification;

import com.ailms.entity.EmployeeEntity;
import com.ailms.entity.UserRoleEntity;
import com.ailms.entity.enums.UserStatusEnum;
import com.ailms.request.EmployeeSearchRequest;
import com.ailms.common.util.SpecificationBuilder;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import org.springframework.data.jpa.domain.Specification;

public final class EmployeeSpecification {

    private EmployeeSpecification() {
    }

    public static Specification<EmployeeEntity> filterAndSearch(EmployeeSearchRequest request) {
        SpecificationBuilder<EmployeeEntity> builder = SpecificationBuilder.of();

        builder.custom((root, query, cb) -> cb.notEqual(root.get("userEntity").get("status"), UserStatusEnum.DELETED));

        if (request == null) {
            return builder.build();
        }

        builder.likeAnyIfPresent(request.getKeyword(), "employeeCode", "position", "userEntity.fullName", "userEntity.email");
        builder.equalIfPresent("employmentTypeEnum", request.getEmploymentTypeEnum());
        builder.equalIfPresent("department.id", request.getDepartmentId());
        if (Boolean.TRUE.equals(request.getUnassignedOnly())) {
            builder.custom((root, query, cb) -> cb.isNull(root.get("department")));
        }
        builder.equalIfPresent("userEntity.gender", request.getGender());
        builder.greaterOrEqualIfPresent("startDate", request.getStartDateFrom());
        builder.lessOrEqualIfPresent("endDate", request.getEndDateTo());
        builder.greaterOrEqualIfPresent("createdAt", request.getCreatedFrom());
        builder.lessOrEqualIfPresent("createdAt", request.getCreatedTo());
        builder.equalIfPresent("status", request.getStatus());
        builder.equalIfPresent("userEntity.status", request.getUserStatus());
        builder.inIfPresent("userId", request.getUserIds());

        if (request.getRoleIds() != null && !request.getRoleIds().isEmpty()) {
            builder.custom((root, query, cb) -> {
                Subquery<Long> subquery = query.subquery(Long.class);
                Root<UserRoleEntity> userRoleRoot = subquery.from(UserRoleEntity.class);
                subquery.select(userRoleRoot.get("userEntity").get("id"))
                        .where(userRoleRoot.get("roleEntity").get("id").in(request.getRoleIds()));
                return root.get("userId").in(subquery);
            });
        }

        return builder.build();
    }
}
