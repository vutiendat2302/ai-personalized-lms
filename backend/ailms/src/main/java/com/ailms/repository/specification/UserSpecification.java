package com.ailms.repository.specification;

import com.ailms.entity.UserEntity;
import com.ailms.entity.UserRoleEntity;
import com.ailms.entity.enums.UserStatusEnum;
import com.ailms.common.util.SpecificationBuilder;
import com.ailms.request.UserSearchRequest;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.util.CollectionUtils;

import com.ailms.entity.StudentProfileEntity;
import com.ailms.entity.EmployeeEntity;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;

public class UserSpecification {

    public static Specification<UserEntity> filterAndSearch(UserSearchRequest request) {
        SpecificationBuilder<UserEntity> builder = SpecificationBuilder.of();

        if (request != null && !CollectionUtils.isEmpty(request.getStatuses())) {
            builder.inIfPresent("status", request.getStatuses());
        } else {
            builder.custom((root, query, criteriaBuilder) ->
                    criteriaBuilder.notEqual(root.get("status"), UserStatusEnum.DELETED));
        }

        if (request == null) {
            return builder.build();
        }

        builder.likeAnyIfPresent(request.getKeyword(), "username", "fullName", "email");
        builder.equalIfPresent("gender", request.getGender());
        builder.greaterOrEqualIfPresent("createdAt", request.getCreatedFrom());
        builder.lessOrEqualIfPresent("createdAt", request.getCreatedTo());

        if (StringUtils.hasText(request.getRoleType())) {
            if ("STUDENT".equalsIgnoreCase(request.getRoleType())) {
                builder.custom((root, query1, criteriaBuilder) -> {
                    Subquery<Long> subquery = query1.subquery(Long.class);
                    Root<StudentProfileEntity> subRoot = subquery.from(StudentProfileEntity.class);
                    subquery.select(subRoot.get("userId"));
                    return root.get("id").in(subquery);
                });
            } else if ("EMPLOYEE".equalsIgnoreCase(request.getRoleType())) {
                builder.custom((root, query1, criteriaBuilder) -> {
                    Subquery<Long> subquery = query1.subquery(Long.class);
                    Root<EmployeeEntity> subRoot = subquery.from(EmployeeEntity.class);
                    subquery.select(subRoot.get("userId"));
                    return root.get("id").in(subquery);
                });
            }
        }

        if (StringUtils.hasText(request.getDepartmentCode())) {
            builder.custom((root, query1, criteriaBuilder) -> {
                Subquery<Long> subquery = query1.subquery(Long.class);
                Root<EmployeeEntity> subRoot = subquery.from(EmployeeEntity.class);
                subquery.select(subRoot.get("userId"));
                subquery.where(criteriaBuilder.equal(subRoot.get("department").get("code"), request.getDepartmentCode()));
                return root.get("id").in(subquery);
            });
        }

        if (!CollectionUtils.isEmpty(request.getRoleIds())) {
            builder.custom((root, query1, criteriaBuilder) -> {
                Subquery<Long> subquery = query1.subquery(Long.class);
                Root<UserRoleEntity> subRoot = subquery.from(UserRoleEntity.class);
                subquery.select(subRoot.get("userEntity").get("id"));
                subquery.where(
                        criteriaBuilder.and(
                                subRoot.get("roleEntity").get("id").in(request.getRoleIds()),
                                criteriaBuilder.or(
                                        criteriaBuilder.isNull(subRoot.get("expiredAt")),
                                        criteriaBuilder.greaterThan(subRoot.get("expiredAt"), LocalDateTime.now())
                                )
                        )
                );
                return root.get("id").in(subquery);
            });
        }

        return builder.build();
    }
}