package com.ailms.repository.specification;

import com.ailms.entity.UserEntity;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.util.StringUtils;

public class UserSpecification {

    public static Specification<UserEntity> filterAndSearch(Integer status, String search) {
        Specification<UserEntity> spec = (root, query, criteriaBuilder) -> criteriaBuilder.conjunction();

        if (status != null) {
            spec = spec.and((root, query, criteriaBuilder) ->
                    criteriaBuilder.equal(root.get("status"), status));
        }

        if (StringUtils.hasText(search)) {
            String pattern = "%" + search.toLowerCase() + "%";
            spec = spec.and((root, query, criteriaBuilder) -> criteriaBuilder.or(
                    criteriaBuilder.like(criteriaBuilder.lower(root.get("username")), pattern),
                    criteriaBuilder.like(criteriaBuilder.lower(root.get("email")), pattern),
                    criteriaBuilder.like(criteriaBuilder.lower(root.get("fullName")), pattern)
            ));
        }

        return spec;
    }
}