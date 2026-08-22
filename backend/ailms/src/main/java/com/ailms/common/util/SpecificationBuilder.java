package com.ailms.common.util;

import jakarta.persistence.criteria.Path;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.util.StringUtils;
import java.util.Collection;

/**
 * - Tìm kiếm theo từ khóa
 * - So sánh bằng
 * - So sánh trong danh sách
 * - So sánh khoảng giá trị
 * - Kết hợp điều kiện tùy chỉnh (CUSTOM)
 * @param <T> Entity cần xây dựng Specification
 */
public class SpecificationBuilder<T> {

    private Specification<T> spec = (root, query, cb) -> cb.conjunction();

    public static <T> SpecificationBuilder<T> of() {
        return new SpecificationBuilder<>();
    }

    /** LIKE không phân biệt hoa thường. */
    public SpecificationBuilder<T> likeIfPresent(String field, String keyword) {
        if (StringUtils.hasText(keyword)) {
            String pattern = "%" + keyword.toLowerCase() + "%";
            spec = spec.and((root, query, cb) -> cb.like(cb.lower(resolvePath(root, field)), pattern));
        }
        return this;
    }

    /** LIKE trên NHIỀU field cùng lúc */
    public SpecificationBuilder<T> likeAnyIfPresent(String keyword, String... fields) {
        if (StringUtils.hasText(keyword)) {
            String pattern = "%" + keyword.toLowerCase() + "%";
            spec = spec.and((root, query, cb) -> {
                Predicate[] predicates = new Predicate[fields.length];
                for (int i = 0; i < fields.length; i++) {
                    predicates[i] = cb.like(cb.lower(resolvePath(root, fields[i])), pattern);
                }
                return cb.or(predicates);
            });
        }
        return this;
    }

    /** so sanh = */
    public <V> SpecificationBuilder<T> equalIfPresent(String field, V value) {
        if (value != null) {
            spec = spec.and((root, query, cb) -> cb.equal(resolvePath(root, field), value));
        }
        return this;
    }

    public <V> SpecificationBuilder<T> inIfPresent(String field, Collection<V> values) {
        if (values != null && !values.isEmpty()) {
            spec = spec.and((root, query, cb) -> resolvePath(root, field).in(values));
        }
        return this;
    }

    /**Thêm điều kiện lớn hơn hoặc bằng (>=).*/
    @SuppressWarnings({ "unchecked", "rawtypes" })
    public SpecificationBuilder<T> greaterOrEqualIfPresent(String field, Comparable value) {
        if (value != null) {
            spec = spec.and((root, query, cb) -> cb.greaterThanOrEqualTo(resolvePath(root, field), value));
        }
        return this;
    }

    /**Thêm điều kiện nhỏ  hơn hoặc bằng (>=).*/
    @SuppressWarnings({ "unchecked", "rawtypes" })
    public SpecificationBuilder<T> lessOrEqualIfPresent(String field, Comparable value) {
        if (value != null) {
            spec = spec.and((root, query, cb) -> cb.lessThanOrEqualTo(resolvePath(root, field), value));
        }
        return this;
    }

    /** Hook mở rộng: cho phép entity tự thêm 1 điều kiện Specification tùy biến bất kỳ. */
    public SpecificationBuilder<T> custom(Specification<T> customSpec) {
        if (customSpec != null) {
            spec = spec.and(customSpec);
        }
        return this;
    }

    public Specification<T> build() {
        return spec;
    }

    /** Hỗ trợ path lồng nhau kiểu "department.name" -> root.get("department").get("name") */
    @SuppressWarnings("unchecked")
    private static <Y> Path<Y> resolvePath(Root<?> root, String field) {
        String[] parts = field.split("\\.");
        Path<Y> path = (Path<Y>) root.get(parts[0]);
        for (int i = 1; i < parts.length; i++) {
            path = (Path<Y>) path.get(parts[i]);
        }
        return path;
    }
}
