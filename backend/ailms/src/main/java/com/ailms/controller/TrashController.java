package com.ailms.controller;

import com.ailms.request.BulkTrashRequest;
import com.ailms.response.ApiResponse;
import com.ailms.response.ChildRecordDetailResponse;
import com.ailms.response.PageResponse;
import com.ailms.response.TrashItemResponse;
import com.ailms.service.imp.TrashAggregatorService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("${api.prefix}/trash")
@RequiredArgsConstructor
public class TrashController {

    private final TrashAggregatorService trashAggregatorService;

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<TrashItemResponse>>> getTrashItems(
            @RequestParam(required = false, defaultValue = "ALL") String entityType,
            @RequestParam(required = false) String keyword,
            @PageableDefault(size = 10) Pageable pageable) {
        PageResponse<TrashItemResponse> response = trashAggregatorService.getAllTrashItems(entityType, keyword, pageable);
        return ResponseEntity.ok(ApiResponse.of("Trash items retrieved successfully", response));
    }

    @GetMapping("/{entityType}/{id}")
    public ResponseEntity<ApiResponse<TrashItemResponse>> getTrashItemDetail(
            @PathVariable String entityType,
            @PathVariable Long id) {
        TrashItemResponse response = trashAggregatorService.getTrashItemDetail(entityType, id);
        return ResponseEntity.ok(ApiResponse.of("Trash item detail retrieved successfully", response));
    }

    @GetMapping("/{entityType}/{id}/check-children")
    public ResponseEntity<ApiResponse<Map<String, Long>>> checkChildRecords(
            @PathVariable String entityType,
            @PathVariable Long id) {
        Map<String, Long> counts = trashAggregatorService.checkChildRecords(entityType, id);
        return ResponseEntity.ok(ApiResponse.of("Child records check completed", counts));
    }

    @GetMapping("/{entityType}/{id}/child-records-detail")
    public ResponseEntity<ApiResponse<java.util.List<ChildRecordDetailResponse>>> getChildRecordDetails(
            @PathVariable String entityType,
            @PathVariable Long id) {
        List<ChildRecordDetailResponse> response = trashAggregatorService.getChildRecordDetails(entityType, id);
        return ResponseEntity.ok(ApiResponse.of("Child records detail retrieved successfully", response));
    }

    @DeleteMapping("/{entityType}/{id}")
    public ResponseEntity<ApiResponse<Void>> hardDelete(
            @PathVariable String entityType,
            @PathVariable Long id) {
        trashAggregatorService.hardDelete(entityType, id);
        return ResponseEntity.ok(ApiResponse.message("Item permanently deleted successfully"));
    }

    @PostMapping("/{entityType}/{id}/restore")
    public ResponseEntity<ApiResponse<Void>> restore(
            @PathVariable String entityType,
            @PathVariable Long id) {
        trashAggregatorService.restore(entityType, id);
        return ResponseEntity.ok(ApiResponse.message("Item restored successfully"));
    }

    @PostMapping("/bulk-hard-delete")
    public ResponseEntity<ApiResponse<Map<String, Object>>> bulkHardDelete(
            @RequestBody BulkTrashRequest request) {
        Map<String, Object> response = trashAggregatorService.bulkHardDelete(request);
        return ResponseEntity.ok(ApiResponse.of("Bulk hard delete completed", response));
    }

    @PostMapping("/bulk-restore")
    public ResponseEntity<ApiResponse<Map<String, Object>>> bulkRestore(
            @RequestBody BulkTrashRequest request) {
        Map<String, Object> response = trashAggregatorService.bulkRestore(request);
        return ResponseEntity.ok(ApiResponse.of("Bulk restore completed", response));
    }
}
