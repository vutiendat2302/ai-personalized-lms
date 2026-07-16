package com.ailms.repository.specification;
 
import com.ailms.entity.TeachingSessionPaymentEntity;
import com.ailms.request.TeachingSessionPaymentSearchRequest;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.util.StringUtils;

public final class TeachingSessionPaymentSpecification {

    private TeachingSessionPaymentSpecification() {
    }

    public static Specification<TeachingSessionPaymentEntity> filterAndSearch(TeachingSessionPaymentSearchRequest request) {
        Specification<TeachingSessionPaymentEntity> spec = (root, query, criteriaBuilder) -> criteriaBuilder.conjunction();

        if (request == null) {
            return spec;
        }

        if (StringUtils.hasText(request.getKeyword())) {
            String pattern = "%" + request.getKeyword().toLowerCase() + "%";
            spec = spec.and((root, query, criteriaBuilder) ->
                    criteriaBuilder.like(criteriaBuilder.lower(root.get("employee").get("employeeCode")), pattern));
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
