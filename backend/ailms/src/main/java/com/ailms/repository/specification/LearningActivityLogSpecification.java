package com.ailms.repository.specification;
 
import com.ailms.entity.LearningActivityLogEntity;
import com.ailms.request.LearningActivityLogSearchRequest;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.util.StringUtils;

public final class LearningActivityLogSpecification {

    private LearningActivityLogSpecification() {
    }

    public static Specification<LearningActivityLogEntity> filterAndSearch(LearningActivityLogSearchRequest request) {
        Specification<LearningActivityLogEntity> spec = (root, query, criteriaBuilder) -> criteriaBuilder.conjunction();

        if (request == null) {
            return spec;
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
