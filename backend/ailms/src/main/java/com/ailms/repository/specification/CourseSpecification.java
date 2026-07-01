package com.ailms.repository.specification;

import com.ailms.entity.CourseEntity;
import com.ailms.request.CourseSearchRequest;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.List;

public class CourseSpecification {

    public static Specification<CourseEntity> buildSpec(CourseSearchRequest request) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (StringUtils.hasText(request.getKeyword())) {
                String keywordPattern = "%" + request.getKeyword().toLowerCase() + "%";
                Predicate namePredicate = cb.like(cb.lower(root.get("name")), keywordPattern);
                Predicate descPredicate = cb.like(cb.lower(root.get("description")), keywordPattern);
                predicates.add(cb.or(namePredicate, descPredicate));
            }

            if (request.getCategoryId() != null) {
                predicates.add(cb.equal(root.get("categoryEntity").get("id"), request.getCategoryId()));
            }

            if (StringUtils.hasText(request.getLevel())) {
                predicates.add(cb.equal(root.get("level"), request.getLevel()));
            }

            if (request.getStatus() != null) {
                predicates.add(cb.equal(root.get("status"), request.getStatus()));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
