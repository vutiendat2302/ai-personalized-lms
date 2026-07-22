package com.ailms.repository.specification;

import com.ailms.entity.RoleEntity;
import com.ailms.common.util.SpecificationBuilder;
import com.ailms.request.RoleSearchRequest;
import org.springframework.data.jpa.domain.Specification;

public class RoleSpecification {

    public static Specification<RoleEntity> filterAndSearch(RoleSearchRequest request) {
        SpecificationBuilder<RoleEntity> builder = SpecificationBuilder.of();

        if (request == null) {
            return builder.build();
        }

        builder.equalIfPresent("isSystem", request.getIsSystem());
        builder.likeAnyIfPresent(request.getKeyword(), "name", "code");

        return builder.build();
    }
}
