package com.ailms.repository.specification;

import com.ailms.entity.CoursePackageEntity;
import com.ailms.common.util.SpecificationBuilder;
import com.ailms.request.CoursePackageSearchRequest;
import org.springframework.data.jpa.domain.Specification;

public final class CoursePackageSpecification {

    private CoursePackageSpecification() {
    }

    public static Specification<CoursePackageEntity> filterAndSearch(CoursePackageSearchRequest request) {
        SpecificationBuilder<CoursePackageEntity> builder = SpecificationBuilder.of();

        if (request == null) {
            return builder.build();
        }

        builder.likeIfPresent("name", request.getKeyword());
        builder.equalIfPresent("courseEntity.id", request.getCourseId());
        builder.equalIfPresent("deliveryMode", request.getDeliveryMode());
        builder.equalIfPresent("status", request.getStatus());

        return builder.build();
    }
}
