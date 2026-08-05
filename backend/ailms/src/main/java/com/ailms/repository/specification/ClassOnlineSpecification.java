package com.ailms.repository.specification;

import com.ailms.entity.ClassOnlineEntity;
import com.ailms.common.util.SpecificationBuilder;
import com.ailms.request.ClassOnlineSearchRequest;
import jakarta.persistence.criteria.JoinType;
import org.springframework.data.jpa.domain.Specification;

public final class ClassOnlineSpecification {

    private ClassOnlineSpecification() {
    }

    public static Specification<ClassOnlineEntity> filterAndSearch(ClassOnlineSearchRequest request) {
        SpecificationBuilder<ClassOnlineEntity> builder = SpecificationBuilder.of();

        if (request == null) {
            return builder.build();
        }

        if (request.getKeyword() != null && !request.getKeyword().isBlank()) {
            String kw = "%" + request.getKeyword().trim().toLowerCase() + "%";
            builder.custom((root, query, cb) -> cb.or(
                    cb.like(cb.lower(root.get("title")), kw),
                    cb.like(cb.lower(root.join("classEntity", JoinType.LEFT).get("name")), kw),
                    cb.like(cb.lower(root.join("classEntity", JoinType.LEFT).get("code")), kw),
                    cb.like(cb.lower(root.join("teacherEntity", JoinType.LEFT).get("fullName")), kw)
            ));
        }

        if (request.getClassId() != null) {
            builder.custom((root, query, cb) -> cb.equal(root.join("classEntity", JoinType.LEFT).get("id"), request.getClassId()));
        }

        builder.equalIfPresent("status", request.getStatus());
        builder.greaterOrEqualIfPresent("scheduledAt", request.getScheduledFrom());
        builder.lessOrEqualIfPresent("scheduledAt", request.getScheduledTo());
        builder.greaterOrEqualIfPresent("createdAt", request.getCreatedFrom());
        builder.lessOrEqualIfPresent("createdAt", request.getCreatedTo());

        return builder.build();
    }
}
