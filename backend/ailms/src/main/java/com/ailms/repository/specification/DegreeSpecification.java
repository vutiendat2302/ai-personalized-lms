package com.ailms.repository.specification;

import com.ailms.common.util.SpecificationBuilder;
import com.ailms.entity.DegreeEntity;
import com.ailms.request.DegreeSearchRequest;
import org.springframework.data.jpa.domain.Specification;

public class DegreeSpecification {

    public static Specification<DegreeEntity> filterAndSearch(DegreeSearchRequest request) {
        SpecificationBuilder<DegreeEntity> builder = SpecificationBuilder.of();

        if (request == null) {
            return builder.build();
        }

        builder.equalIfPresent("categoryEntity.id", request.getCategoryId());
        builder.equalIfPresent("type", request.getType());
        builder.equalIfPresent("status", request.getStatus());
        builder.likeAnyIfPresent(request.getKeyword(), "title", "universityName");

        return builder.build();
    }
}
