package com.ailms.repository.specification;
 
import com.ailms.entity.StudentProfileEntity;
import com.ailms.request.StudentProfileSearchRequest;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.util.StringUtils;

public final class StudentProfileSpecification {

    private StudentProfileSpecification() {
    }

    public static Specification<StudentProfileEntity> filterAndSearch(StudentProfileSearchRequest request) {
        Specification<StudentProfileEntity> spec = (root, query, criteriaBuilder) -> criteriaBuilder.conjunction();

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
