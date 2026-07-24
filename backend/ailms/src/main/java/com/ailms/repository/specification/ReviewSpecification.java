package com.ailms.repository.specification;

import com.ailms.entity.ReviewEntity;
import com.ailms.common.util.SpecificationBuilder;
import com.ailms.request.ReviewSearchRequest;
import org.springframework.data.jpa.domain.Specification;

public class ReviewSpecification {

    public static Specification<ReviewEntity> filterAndSearch(ReviewSearchRequest request) {
        SpecificationBuilder<ReviewEntity> builder = SpecificationBuilder.of();

        if (request == null) {
            return builder.build();
        }

        builder.likeAnyIfPresent(request.getKeyword(), "courseEntity.name", "userEntity.fullName", "comment");
        builder.equalIfPresent("courseId", request.getCourseId());
        builder.equalIfPresent("rating", request.getRating());
        builder.equalIfPresent("status", request.getStatus());
        builder.greaterOrEqualIfPresent("createdAt", request.getCreatedFrom());
        builder.lessOrEqualIfPresent("createdAt", request.getCreatedTo());

        // Join fetch relations to avoid N+1 queries during results fetch
        builder.custom((root, query, cb) -> {
            if (query.getResultType() != Long.class && query.getResultType() != long.class) {
                root.fetch("courseEntity", jakarta.persistence.criteria.JoinType.LEFT);
                root.fetch("userEntity", jakarta.persistence.criteria.JoinType.LEFT);
            }
            return cb.conjunction();
        });

        return builder.build();
    }
}
