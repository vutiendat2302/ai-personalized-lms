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

        builder.likeAnyIfPresent(request.getKeyword(), "username", "email", "fullName");
        builder.greaterOrEqualIfPresent("createdAt", request.getCreatedFrom());
        builder.lessOrEqualIfPresent("createdAt", request.getCreatedTo());

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