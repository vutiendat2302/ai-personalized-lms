package com.ailms.repository.specification;

import com.ailms.entity.AuditLogEntity;
import com.ailms.request.AuditLogSearchRequest;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.util.StringUtils;

public class AuditLogSpecification {

    public static Specification<AuditLogEntity> filterAndSearch(AuditLogSearchRequest request) {
        Specification<AuditLogEntity> spec = (root, query, criteriaBuilder) -> criteriaBuilder.conjunction();

        if (request == null) {
            return spec;
        }

        if (request.getUserId() != null) {
            spec = spec.and((root, query, criteriaBuilder) ->
                    criteriaBuilder.equal(root.get("user").get("id"), request.getUserId()));
        }

        if (StringUtils.hasText(request.getKeyword())) {
            String pattern = "%" + request.getKeyword().toLowerCase() + "%";
            spec = spec.and((root, query, criteriaBuilder) -> criteriaBuilder.or(
                    criteriaBuilder.like(criteriaBuilder.lower(root.get("action")), pattern),
                    criteriaBuilder.like(criteriaBuilder.lower(root.get("entityType")), pattern),
                    criteriaBuilder.like(criteriaBuilder.lower(root.get("ipAddress")), pattern)
            ));
        }

        if (StringUtils.hasText(request.getEntityType())) {
            spec = spec.and((root, query, criteriaBuilder) ->
                    criteriaBuilder.equal(root.get("entityType"), request.getEntityType()));
        }

        if (request.getEntityId() != null) {
            spec = spec.and((root, query, criteriaBuilder) ->
                    criteriaBuilder.equal(root.get("entityId"), request.getEntityId()));
        }

        if (StringUtils.hasText(request.getAction())) {
            spec = spec.and((root, query, criteriaBuilder) ->
                    criteriaBuilder.equal(root.get("action"), request.getAction()));
        }

        if (request.getOccurredFrom() != null) {
            spec = spec.and((root, query, criteriaBuilder) ->
                    criteriaBuilder.greaterThanOrEqualTo(root.get("occurredAt"), request.getOccurredFrom()));
        }

        if (request.getOccurredTo() != null) {
            spec = spec.and((root, query, criteriaBuilder) ->
                    criteriaBuilder.lessThanOrEqualTo(root.get("occurredAt"), request.getOccurredTo()));
        }

        return spec;
    }
}
