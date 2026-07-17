package com.ailms.request;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import java.util.List;
import java.util.Objects;

@Getter
@Setter
public class BaseSearchRequest {

    private static final int DEFAULT_PAGE = 0;
    private static final int DEFAULT_SIZE = 10;
    private static final int MAX_SIZE = 200;

    /**
     * Trang hiện tại, bắt đầu từ 0
     */
    private Integer page = DEFAULT_PAGE;

    /**
     * Số phần tử mỗi trang, tối đa MAX_SIZE để tránh query quá nặng
     */
    private Integer size = DEFAULT_SIZE;

    /**
     * Danh sách sort, mỗi phần tử dạng "field,direction"
     * Mặc định sort theo "id,desc"
     */
    private List<String> sort = List.of("id,desc");

    public Pageable toPageable() {
        int safePage = (page == null || page < 0) ? DEFAULT_PAGE : page;
        int safeSize = (size == null || size <= 0 || size > MAX_SIZE) ? DEFAULT_SIZE : size;

        List<Sort.Order> orders = (sort == null || sort.isEmpty())
                ? List.of(new Sort.Order(Sort.Direction.DESC, "id"))
                : sort.stream()
                .map(this::parseSortItem)
                .filter(Objects::nonNull)
                .toList();

        Sort finalSort = orders.isEmpty()
                ? Sort.by(Sort.Direction.DESC, "id")
                : Sort.by(orders);

        return PageRequest.of(safePage, safeSize, finalSort);
    }

    private Sort.Order parseSortItem(String item) {
        if (item == null || item.isBlank()) return null;
        String[] parts = item.split(",");
        String field = parts[0].trim();
        Sort.Direction direction = (parts.length > 1 && "asc".equalsIgnoreCase(parts[1].trim()))
                ? Sort.Direction.ASC
                : Sort.Direction.DESC;
        return new Sort.Order(direction, field);
    }
}
