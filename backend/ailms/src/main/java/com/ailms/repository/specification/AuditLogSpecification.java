package com.ailms.repository.specification;

import com.ailms.entity.AuditLogEntity;
import com.ailms.common.util.SpecificationBuilder;
import com.ailms.request.AuditLogSearchRequest;
import org.springframework.data.jpa.domain.Specification;

public class AuditLogSpecification {

    public static Specification<AuditLogEntity> filterAndSearch(AuditLogSearchRequest request) {
        SpecificationBuilder<AuditLogEntity> builder = SpecificationBuilder.of();

        if (request == null) {
            return builder.build();
        }

        builder.equalIfPresent("user.id", request.getUserId());
        builder.likeAnyIfPresent(request.getKeyword(), "action", "entityType", "ipAddress");
        builder.equalIfPresent("entityType", request.getEntityType());
        builder.equalIfPresent("entityId", request.getEntityId());
        builder.equalIfPresent("action", request.getAction());
        builder.greaterOrEqualIfPresent("occurredAt", request.getOccurredFrom());
        builder.lessOrEqualIfPresent("occurredAt", request.getOccurredTo());

        return builder.build();
    }
}
