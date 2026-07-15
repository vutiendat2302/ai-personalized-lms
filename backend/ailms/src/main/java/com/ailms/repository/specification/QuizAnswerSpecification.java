package com.ailms.repository.specification;
 
import com.ailms.entity.QuizAnswerEntity;
import com.ailms.request.QuizAnswerSearchRequest;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.util.StringUtils;

public final class QuizAnswerSpecification {

    private QuizAnswerSpecification() {
    }

    public static Specification<QuizAnswerEntity> filterAndSearch(QuizAnswerSearchRequest request) {
        Specification<QuizAnswerEntity> spec = (root, query, criteriaBuilder) -> criteriaBuilder.conjunction();

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
