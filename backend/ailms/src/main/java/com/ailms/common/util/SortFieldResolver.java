package com.ailms.common.util;

import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
@RequiredArgsConstructor
public class SortFieldResolver {
    private final EntityManager entityManager;

    private final Map<Class<?>, String> idFieldCache = new ConcurrentHashMap<>();

    /**
     * Chuyển đổi trường sort "id" từ request thành
     * tên khóa chính thực tế của entity.
     * API có thể sử dụng thống nhất trường "id" cho tất cả entity
     *
     * @param sort        Thông tin sắp xếp nhận từ request
     * @param entityClass Entity cần lấy metadata khóa chính
     * @return Danh sach sort
     */
    public Sort resolve(Sort sort, Class<?> entityClass) {
        if (sort == null || sort.isUnsorted()) return sort;

        // Lấy tên trường khóa chính thực tế của entity
        String actualIdField = idFieldCache.computeIfAbsent(entityClass,
                clazz -> entityManager.getMetamodel().entity(clazz).getId(Object.class).getName());
        // Thay thế property "id" bằng tên khóa chính thực tế
        return Sort.by(sort.stream()
                .map(order -> "id".equals(order.getProperty())
                        ? order.withProperty(actualIdField)
                        : order)
                .toList());
    }
}
