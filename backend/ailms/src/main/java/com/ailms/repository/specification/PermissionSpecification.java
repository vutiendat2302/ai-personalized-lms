package com.ailms.repository.specification;

import com.ailms.entity.PermissionEntity;
import com.ailms.request.PermissionSearchRequest;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.util.StringUtils;

public class PermissionSpecification {

    public static Specification<PermissionEntity> filterAndSearch(PermissionSearchRequest request) {
        Specification<PermissionEntity> spec = (root, query, criteriaBuilder) -> criteriaBuilder.conjunction();

        if (request == null) {
            return spec;
        }

        if (StringUtils.hasText(request.getEntity())) {
            spec = spec.and((root, query, criteriaBuilder) ->
                    criteriaBuilder.equal(root.get("entity"), request.getEntity()));
        }

        if (StringUtils.hasText(request.getAction())) {
            spec = spec.and((root, query, criteriaBuilder) ->
                    criteriaBuilder.equal(root.get("action"), request.getAction()));
        }

        if (StringUtils.hasText(request.getKeyword())) {
            String pattern = "%" + request.getKeyword().toLowerCase() + "%";
            spec = spec.and((root, query, criteriaBuilder) -> criteriaBuilder.or(
                    criteriaBuilder.like(criteriaBuilder.lower(root.get("name")), pattern),
                    criteriaBuilder.like(criteriaBuilder.lower(root.get("code")), pattern),
                    criteriaBuilder.like(criteriaBuilder.lower(root.get("description")), pattern)
            ));
        }

        return spec;
    }
}
