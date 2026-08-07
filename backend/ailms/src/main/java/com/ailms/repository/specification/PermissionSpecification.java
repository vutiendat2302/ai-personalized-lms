package com.ailms.repository.specification;

import com.ailms.entity.PermissionEntity;
import com.ailms.entity.RolePermissionEntity;
import com.ailms.common.util.SpecificationBuilder;
import com.ailms.request.PermissionSearchRequest;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import org.springframework.data.jpa.domain.Specification;

public class PermissionSpecification {

    public static Specification<PermissionEntity> filterAndSearch(PermissionSearchRequest request) {
        SpecificationBuilder<PermissionEntity> builder = SpecificationBuilder.of();

        if (request == null) {
            return builder.build();
        }

        if (org.springframework.util.StringUtils.hasText(request.getEntity())) {
            builder.custom((root, query, cb) -> cb.equal(cb.lower(root.get("entity")), request.getEntity().toLowerCase()));
        }
        if (org.springframework.util.StringUtils.hasText(request.getAction())) {
            builder.custom((root, query, cb) -> cb.equal(cb.lower(root.get("action")), request.getAction().toLowerCase()));
        }
        builder.likeAnyIfPresent(request.getKeyword(), "name", "code", "description");

        if ("USED".equalsIgnoreCase(request.getAssignedStatus())) {
            builder.custom((root, query, cb) -> {
                Subquery<Long> subquery = query.subquery(Long.class);
                Root<RolePermissionEntity> rpRoot = subquery.from(RolePermissionEntity.class);
                subquery.select(rpRoot.get("permissionEntity").get("id"));
                return root.get("id").in(subquery);
            });
        } else if ("ORPHAN".equalsIgnoreCase(request.getAssignedStatus())) {
            builder.custom((root, query, cb) -> {
                Subquery<Long> subquery = query.subquery(Long.class);
                Root<RolePermissionEntity> rpRoot = subquery.from(RolePermissionEntity.class);
                subquery.select(rpRoot.get("permissionEntity").get("id"));
                return cb.not(root.get("id").in(subquery));
            });
        }

        return builder.build();
    }
}
