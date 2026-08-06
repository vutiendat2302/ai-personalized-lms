package com.ailms.repository.specification;

import com.ailms.entity.ClassOnlineEntity;
import com.ailms.common.util.SpecificationBuilder;
import com.ailms.request.ClassOnlineSearchRequest;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Root;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDate;
import java.time.LocalDateTime;

public final class ClassOnlineSpecification {

    private ClassOnlineSpecification() {
    }

    public static Specification<ClassOnlineEntity> filterAndSearch(ClassOnlineSearchRequest request) {
        return filterAndSearch(request, false);
    }

    public static Specification<ClassOnlineEntity> filterAndSearch(
            ClassOnlineSearchRequest request,
            boolean applyDefaultScheduleOrder
    ) {
        SpecificationBuilder<ClassOnlineEntity> builder = SpecificationBuilder.of();

        if (request == null) {
            return builder.build();
        }

        if (applyDefaultScheduleOrder) {
            builder.custom((root, query, cb) -> {
                if (!Long.class.equals(query.getResultType()) && !long.class.equals(query.getResultType())) {
                    LocalDate today = LocalDate.now();
                    LocalDateTime startOfToday = today.atStartOfDay();
                    LocalDateTime startOfTomorrow = today.plusDays(1).atStartOfDay();
                    LocalDateTime now = LocalDateTime.now();

                    Expression<Integer> scheduleBucket = cb.<Integer>selectCase()
                            .when(cb.isNull(root.get("scheduledAt")), 3)
                            .when(cb.and(
                                    cb.greaterThanOrEqualTo(root.<LocalDateTime>get("scheduledAt"), startOfToday),
                                    cb.lessThan(root.<LocalDateTime>get("scheduledAt"), startOfTomorrow)
                            ), 0)
                            .when(cb.greaterThan(root.<LocalDateTime>get("scheduledAt"), now), 1)
                            .otherwise(2);

                    query.orderBy(
                            cb.asc(scheduleBucket),
                            cb.asc(scheduleDistanceFromNow(root, cb)),
                            cb.desc(root.get("id"))
                    );
                }
                return cb.conjunction();
            });
        }

        if (request.getKeyword() != null && !request.getKeyword().isBlank()) {
            String kw = "%" + request.getKeyword().trim().toLowerCase() + "%";
            builder.custom((root, query, cb) -> cb.or(
                    cb.like(cb.lower(root.get("code")), kw),
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

    private static Expression<Long> scheduleDistanceFromNow(Root<ClassOnlineEntity> root, CriteriaBuilder cb) {
        Expression<Long> scheduledAtEpoch = cb.function("unix_timestamp", Long.class, root.get("scheduledAt"));
        Expression<Long> nowEpoch = cb.function("unix_timestamp", Long.class, cb.currentTimestamp());
        return cb.abs(cb.diff(scheduledAtEpoch, nowEpoch));
    }
}
