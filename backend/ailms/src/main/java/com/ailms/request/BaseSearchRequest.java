package com.ailms.request;

import lombok.Getter;
import lombok.Setter;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

@Getter
@Setter
public class BaseSearchRequest {

    private static final int DEFAULT_PAGE = 0;
    private static final int DEFAULT_SIZE = 10;
    private static final int MAX_SIZE = 100;

    /**
     * Trang hiện tại, bắt đầu từ 0
     */
    private Integer page = DEFAULT_PAGE;

    /**
     * Số phần tử mỗi trang, tối đa MAX_SIZE để tránh query quá nặng
     */
    private Integer size = DEFAULT_SIZE;

    /**
     * Field để sort, vd: "name", "createdAt"
     */
    private String sortBy = "name";

    /**
     * ASC hoặc DESC
     */
    private String sortDirection = "DESC";

    public Pageable toPageable() {
        int safePage = (page == null || page < 0) ? DEFAULT_PAGE : page;
        int safeSize = (size == null || size <= 0 || size > MAX_SIZE) ? DEFAULT_SIZE : size;

        Sort.Direction direction = "ASC".equalsIgnoreCase(sortDirection)
                ? Sort.Direction.ASC
                : Sort.Direction.DESC;

        String safeSortBy = (sortBy == null || sortBy.isBlank()) ? "createdAt" : sortBy;

        return PageRequest.of(safePage, safeSize, Sort.by(direction, safeSortBy));
    }

}
