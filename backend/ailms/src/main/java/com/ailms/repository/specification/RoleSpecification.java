package com.ailms.repository.specification;

import com.ailms.entity.RoleEntity;
import com.ailms.request.RoleSearchRequest;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.util.StringUtils;

public class RoleSpecification {

    public static Specification<RoleEntity> filterAndSearch(RoleSearchRequest request) {
        Specification<RoleEntity> spec = (root, query, criteriaBuilder) -> criteriaBuilder.conjunction();

        if (request == null) {
            return spec;
        }

        if (request.getIsSystem() != null) {
            spec = spec.and((root, query, criteriaBuilder) ->
                    criteriaBuilder.equal(root.get("isSystem"), request.getIsSystem()));

        }

        if (StringUtils.hasText(request.getKeyword())) {
            String pattern = "%" + request.getKeyword().toLowerCase() + "%";
            spec = spec.and((root, query, criteriaBuilder) -> criteriaBuilder.or(
                    criteriaBuilder.like(criteriaBuilder.lower(root.get("name")), pattern),
                    criteriaBuilder.like(criteriaBuilder.lower(root.get("code")), pattern)
            ));
        }

        return spec;
    }
}
