package com.ailms.service.imp;

import com.ailms.request.BulkTrashRequest;
import com.ailms.response.PageResponse;
import com.ailms.response.TrashItemResponse;
import com.ailms.service.ITrashable;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * Service tổng hợp (Aggregator/Facade) điều hướng thao tác Thùng rác (Unified Trash System)
 * dựa theo loại Entity (entityType).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class TrashAggregatorService {

    private final List<ITrashable> trashableServices;

    private ITrashable getService(String entityType) {
        if (entityType == null || entityType.trim().isEmpty() || "ALL".equalsIgnoreCase(entityType)) {
            entityType = "USER";
        }
        final String finalType = entityType;
        return trashableServices.stream()
                .filter(s -> s.getEntityType().equalsIgnoreCase(finalType))
                .findFirst()
                .orElse(null);
    }

    public PageResponse<TrashItemResponse> getAllTrashItems(String entityType, String keyword, Pageable pageable) {
        if (entityType == null || entityType.trim().isEmpty() || "ALL".equalsIgnoreCase(entityType)) {
            List<TrashItemResponse> allItems = new ArrayList<>();
            for (ITrashable service : trashableServices) {
                try {
                    PageResponse<TrashItemResponse> res = service.getTrashItems(keyword, Pageable.unpaged());
                    if (res != null && res.getContent() != null) {
                        allItems.addAll(res.getContent());
                    }
                } catch (Exception e) {
                    log.warn("Failed to fetch trash items from service {}: {}", service.getEntityType(), e.getMessage());
                }
            }

            allItems.sort((a, b) -> {
                if (a.getDeletedAt() == null && b.getDeletedAt() == null) return 0;
                if (a.getDeletedAt() == null) return 1;
                if (b.getDeletedAt() == null) return -1;
                return b.getDeletedAt().compareTo(a.getDeletedAt());
            });

            if (pageable.isUnpaged()) {
                return PageResponse.from(new PageImpl<>(allItems));
            }

            int total = allItems.size();
            int start = (int) pageable.getOffset();
            if (start >= total) {
                return PageResponse.from(new PageImpl<>(Collections.emptyList(), pageable, total));
            }
            int end = Math.min(start + pageable.getPageSize(), total);
            List<TrashItemResponse> pagedList = allItems.subList(start, end);
            return PageResponse.from(new PageImpl<>(pagedList, pageable, total));
        }

        ITrashable service = getService(entityType);
        if (service == null) {
            return PageResponse.from(new PageImpl<>(Collections.emptyList(), pageable, 0));
        }
        return service.getTrashItems(keyword, pageable);
    }

    public TrashItemResponse getTrashItemDetail(String entityType, Long id) {
        return getService(entityType).getTrashItemDetail(id);
    }

    public Map<String, Long> checkChildRecords(String entityType, Long id) {
        return getService(entityType).checkChildRecords(id);
    }

    public List<com.ailms.response.ChildRecordDetailResponse> getChildRecordDetails(String entityType, Long id) {
        return getService(entityType).getChildRecordDetails(id);
    }

    public void hardDelete(String entityType, Long id) {
        getService(entityType).hardDelete(id);
    }

    public void restore(String entityType, Long id) {
        getService(entityType).restore(id);
    }

    public Map<String, Object> bulkHardDelete(BulkTrashRequest request) {
        if (request == null || request.getIds() == null || request.getIds().isEmpty()) {
            return Map.of("successCount", 0, "failureCount", 0, "errors", Collections.emptyList());
        }
        return getService(request.getEntityType()).bulkHardDelete(request.getIds());
    }

    public Map<String, Object> bulkRestore(BulkTrashRequest request) {
        if (request == null || request.getIds() == null || request.getIds().isEmpty()) {
            return Map.of("successCount", 0, "failureCount", 0, "errors", Collections.emptyList());
        }
        return getService(request.getEntityType()).bulkRestore(request.getIds());
    }
}
