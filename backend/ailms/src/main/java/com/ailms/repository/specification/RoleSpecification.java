package com.ailms.repository.specification;

import com.ailms.entity.RoleEntity;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.util.StringUtils;

public class RoleSpecification {

    public static Specification<RoleEntity> filterAndSearch(Boolean isSystem, String search) {
        Specification<RoleEntity> spec = (root, query, criteriaBuilder) -> criteriaBuilder.conjunction();

        if (isSystem != null) {
            spec = spec.and((root, query, criteriaBuilder) ->
                    criteriaBuilder.equal(root.get("isSystem"), isSystem));
        }

        if (StringUtils.hasText(search)) {
            String pattern = "%" + search.toLowerCase() + "%";
            spec = spec.and((root, query, criteriaBuilder) -> criteriaBuilder.or(
                    criteriaBuilder.like(criteriaBuilder.lower(root.get("name")), pattern),
                    criteriaBuilder.like(criteriaBuilder.lower(root.get("code")), pattern)
            ));
        }

        return spec;
    }
}