package com.ailms.request;

import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class CoursePackageSearchRequestTest {

    /** Kiểm tra mặc định trả gói có thời gian tạo mới nhất trước. */
    @Test
    void toPageableDefaultsToNewestCreatedAt() {
        Pageable pageable = new CoursePackageSearchRequest().toPageable();

        assertEquals(Sort.Direction.DESC, pageable.getSort().getOrderFor("createdAt").getDirection());
    }

    /** Kiểm tra client có thể đảo chiều sắp xếp thời gian tạo. */
    @Test
    void toPageableAcceptsCreatedAtAscending() {
        CoursePackageSearchRequest request = new CoursePackageSearchRequest();
        request.setSort(List.of("createdAt:asc"));

        Pageable pageable = request.toPageable();

        assertEquals(Sort.Direction.ASC, pageable.getSort().getOrderFor("createdAt").getDirection());
    }
}
