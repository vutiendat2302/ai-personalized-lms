package com.ailms.repository.specification;

import com.ailms.entity.CategoryEntity;
import com.ailms.request.CategorySearchRequest;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;


public final class CategorySpecification {
    private CategorySpecification() {

    }

    public static Specification<CategoryEntity> build(CategorySearchRequest request) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (request.getName() != null && !request.getName().isBlank()) {
                predicates.add(cb.like(
                        cb.lower(root.get("name")),
                        "%" + request.getName().trim().toLowerCase() + "%"
                ));
            }

            if (request.getStatus() != null) {
                predicates.add(cb.equal(root.get("status"), request.getStatus()));
            }

            if (request.getCreatedFrom() != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), request.getCreatedFrom()));
            }

            if (request.getCreatedTo() != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"), request.getCreatedTo()));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
