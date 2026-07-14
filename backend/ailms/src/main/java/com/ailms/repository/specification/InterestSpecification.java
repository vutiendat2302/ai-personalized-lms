package com.ailms.repository.specification;

import com.ailms.entity.InterestEntity;
import com.ailms.request.InterestSearchRequest;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.util.StringUtils;

public final class InterestSpecification {

    private InterestSpecification() {
    }

    public static Specification<InterestEntity> filterAndSearch(InterestSearchRequest request) {
        Specification<InterestEntity> spec = (root, query, criteriaBuilder) -> criteriaBuilder.conjunction();

        if (request == null) {
            return spec;
        }

        if (StringUtils.hasText(request.getKeyword())) {
            String pattern = "%" + request.getKeyword().toLowerCase() + "%";
            spec = spec.and((root, query, criteriaBuilder) -> criteriaBuilder.or(
                    criteriaBuilder.like(criteriaBuilder.lower(root.get("code")), pattern),
                    criteriaBuilder.like(criteriaBuilder.lower(root.get("name")), pattern)
            ));
        }

        if (request.getStatus() != null) {
            spec = spec.and((root, query, criteriaBuilder) ->
                    criteriaBuilder.equal(root.get("status"), request.getStatus()));
        }

        if (request.getCreatedFrom() != null) {
            spec = spec.and((root, query, criteriaBuilder) ->
                    criteriaBuilder.greaterThanOrEqualTo(root.get("createdAt"), request.getCreatedFrom()));
        }

        if (request.getCreatedTo() != null) {
            spec = spec.and((root, query, criteriaBuilder) ->
                    criteriaBuilder.lessThanOrEqualTo(root.get("createdAt"), request.getCreatedTo()));
        }

        return spec;
    }
}
