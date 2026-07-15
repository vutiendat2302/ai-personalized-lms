package com.ailms.repository.specification;
 
import com.ailms.entity.EmployeeEntity;
import com.ailms.request.EmployeeSearchRequest;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.util.StringUtils;

public final class EmployeeSpecification {

    private EmployeeSpecification() {
    }

    public static Specification<EmployeeEntity> filterAndSearch(EmployeeSearchRequest request) {
        Specification<EmployeeEntity> spec = (root, query, criteriaBuilder) -> criteriaBuilder.conjunction();

        if (request == null) {
            return spec;
        }

        if (StringUtils.hasText(request.getKeyword())) {
            String pattern = "%" + request.getKeyword().toLowerCase() + "%";
            spec = spec.and(((root, query, criteriaBuilder) ->
                    criteriaBuilder.or(
                            criteriaBuilder.like(criteriaBuilder.lower(root.get("employeeCode")), pattern),
                            criteriaBuilder.like(criteriaBuilder.lower(root.get("position")), pattern),
                            criteriaBuilder.like(criteriaBuilder.lower(root.get("userEntity").get("username")), pattern))
                    ));
        }

        if (request.getEmploymentTypeEnum() != null) {
            spec = spec.and((root, query, criteriaBuilder) ->
                    criteriaBuilder.equal(
                            root.get("employmentTypeEnum"),
                            request.getEmploymentTypeEnum()
                    ));
        }

        if (request.getStartDateFrom() != null) {
            spec = spec.and((root, query, criteriaBuilder) ->
                    criteriaBuilder.greaterThanOrEqualTo(root.get("startDate"), request.getStartDateFrom()));
        }

        if (request.getEndDateTo() != null) {
            spec = spec.and((root, query, criteriaBuilder) ->
                    criteriaBuilder.lessThanOrEqualTo(root.get("endDate"), request.getEndDateTo()));
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
