package com.ailms.repository.specification;

import com.ailms.entity.AuditLogEntity;
import com.ailms.common.util.SpecificationBuilder;
import com.ailms.request.AuditLogSearchRequest;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.util.StringUtils;
import jakarta.persistence.criteria.JoinType;

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
        
        // Lọc theo nhiều hành động (nếu có) hoặc một hành động cụ thể
        if (request.getActions() != null && !request.getActions().isEmpty()) {
            builder.inIfPresent("action", request.getActions());
        } else {
            builder.equalIfPresent("action", request.getAction());
        }

        // Lọc theo địa chỉ IP
        builder.likeIfPresent("ipAddress", request.getIpAddress());

        // Lọc theo tên hoặc email của tài khoản thực hiện
        if (StringUtils.hasText(request.getUserQuery())) {
            String pattern = "%" + request.getUserQuery().toLowerCase() + "%";
            builder.custom((root, query, cb) -> {
                var userJoin = root.join("user", JoinType.LEFT);
                return cb.or(
                    cb.like(cb.lower(userJoin.get("fullName")), pattern),
                    cb.like(cb.lower(userJoin.get("email")), pattern)
                );
            });
        }

        builder.greaterOrEqualIfPresent("occurredAt", request.getOccurredFrom());
        builder.lessOrEqualIfPresent("occurredAt", request.getOccurredTo());

        return builder.build();
    }
}
