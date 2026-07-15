package com.ailms.repository.specification;
 
import com.ailms.entity.QuestionOptionEntity;
import com.ailms.request.QuestionOptionSearchRequest;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.util.StringUtils;

public final class QuestionOptionSpecification {

    private QuestionOptionSpecification() {
    }

    public static Specification<QuestionOptionEntity> filterAndSearch(QuestionOptionSearchRequest request) {
        Specification<QuestionOptionEntity> spec = (root, query, criteriaBuilder) -> criteriaBuilder.conjunction();

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
