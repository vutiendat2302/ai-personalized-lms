package com.ailms.repository.specification;
 
import com.ailms.entity.StudyGoalEntity;
import com.ailms.request.StudyGoalSearchRequest;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.util.StringUtils;

public final class StudyGoalSpecification {

    private StudyGoalSpecification() {
    }

    public static Specification<StudyGoalEntity> filterAndSearch(StudyGoalSearchRequest request) {
        Specification<StudyGoalEntity> spec = (root, query, criteriaBuilder) -> criteriaBuilder.conjunction();

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
