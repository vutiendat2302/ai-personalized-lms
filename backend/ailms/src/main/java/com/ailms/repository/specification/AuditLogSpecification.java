package com.ailms.repository.specification;

import com.ailms.entity.AuditLogEntity;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;

public class AuditLogSpecification {

    public static Specification<AuditLogEntity> filterLogs(
            String entityType,
            Long entityId,
            String action,
            LocalDateTime start,
            LocalDateTime end) {
        
        Specification<AuditLogEntity> spec = (root, query, criteriaBuilder) -> criteriaBuilder.conjunction();

        if (StringUtils.hasText(entityType)) {
            spec = spec.and((root, query, criteriaBuilder) ->
                    criteriaBuilder.equal(root.get("entityType"), entityType));
        }

        if (entityId != null) {
            spec = spec.and((root, query, criteriaBuilder) ->
                    criteriaBuilder.equal(root.get("entityId"), entityId));
        }

        if (StringUtils.hasText(action)) {
            spec = spec.and((root, query, criteriaBuilder) ->
                    criteriaBuilder.equal(root.get("action"), action));
        }

        if (start != null) {
            spec = spec.and((root, query, criteriaBuilder) ->
                    criteriaBuilder.greaterThanOrEqualTo(root.get("occurredAt"), start));
        }

        if (end != null) {
            spec = spec.and((root, query, criteriaBuilder) ->
                    criteriaBuilder.lessThanOrEqualTo(root.get("occurredAt"), end));
        }

        return spec;
    }
}
