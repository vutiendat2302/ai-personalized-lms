package com.ailms.repository.specification;

import com.ailms.entity.PermissionEntity;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.util.StringUtils;

public class PermissionSpecification {

    public static Specification<PermissionEntity> filterAndSearch(String entityFilter, String actionFilter, String search) {
        Specification<PermissionEntity> spec = (root, query, criteriaBuilder) -> criteriaBuilder.conjunction();

        if (StringUtils.hasText(entityFilter)) {
            spec = spec.and((root, query, criteriaBuilder) ->
                    criteriaBuilder.equal(root.get("entity"), entityFilter));
        }

        if (StringUtils.hasText(actionFilter)) {
            spec = spec.and((root, query, criteriaBuilder) ->
                    criteriaBuilder.equal(root.get("action"), actionFilter));
        }

        if (StringUtils.hasText(search)) {
            String pattern = "%" + search.toLowerCase() + "%";
            spec = spec.and((root, query, criteriaBuilder) -> criteriaBuilder.or(
                    criteriaBuilder.like(criteriaBuilder.lower(root.get("name")), pattern),
                    criteriaBuilder.like(criteriaBuilder.lower(root.get("code")), pattern),
                    criteriaBuilder.like(criteriaBuilder.lower(root.get("description")), pattern)
            ));
        }

        return spec;
    }
}