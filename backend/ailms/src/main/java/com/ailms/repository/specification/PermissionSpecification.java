package com.ailms.repository.specification;

import com.ailms.entity.PermissionEntity;
import com.ailms.common.util.SpecificationBuilder;
import com.ailms.request.PermissionSearchRequest;
import org.springframework.data.jpa.domain.Specification;

public class PermissionSpecification {

    public static Specification<PermissionEntity> filterAndSearch(PermissionSearchRequest request) {
        SpecificationBuilder<PermissionEntity> builder = SpecificationBuilder.of();

        if (request == null) {
            return builder.build();
        }

        builder.equalIfPresent("entity", request.getEntity());
        builder.equalIfPresent("action", request.getAction());
        builder.likeAnyIfPresent(request.getKeyword(), "name", "code", "description");

        return builder.build();
    }
}
