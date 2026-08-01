package com.ailms.request;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import java.util.Arrays;
import java.util.List;
import java.util.Objects;

@Getter
@Setter
@Slf4j
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
    private List<String> sort = List.of("id:desc");

    public Pageable toPageable() {
        int safePage = (page == null || page < 0) ? DEFAULT_PAGE : page;
        int safeSize = (size == null || size <= 0 || size > MAX_SIZE) ? DEFAULT_SIZE : size;

        log.debug("sort raw = {}", sort);

        List<Sort.Order> orders = (sort == null || sort.isEmpty())
                ? List.of(new Sort.Order(Sort.Direction.DESC, "id"))
                : sort.stream()
                  .filter(Objects::nonNull)
                  .flatMap(s -> Arrays.stream(s.split(",")))
                  .map(this::parseSortItem)
                  .filter(Objects::nonNull)
                  .toList();

        Sort finalSort = orders.isEmpty()
                ? Sort.by(Sort.Direction.DESC, "id")
                : Sort.by(orders);

        return PageRequest.of(safePage, safeSize, finalSort);
    }

    protected List<String> allowedSortFields() {
        return List.of(); // subclass override nếu cần whitelist
    }

    private Sort.Order parseSortItem(String item) {
        if (item == null || item.isBlank()) return null;
        String[] parts = item.split(":");
        String field = parts[0].trim();

        List<String> allowed = allowedSortFields();
        if (!allowed.isEmpty() && !allowed.contains(field)) {
            return null; // hoặc throw exception tùy bạn muốn strict hay silent-skip
        }

        Sort.Direction direction = (parts.length > 1 && "asc".equalsIgnoreCase(parts[1].trim()))
                ? Sort.Direction.ASC
                : Sort.Direction.DESC;
        return new Sort.Order(direction, field);
    }
}
