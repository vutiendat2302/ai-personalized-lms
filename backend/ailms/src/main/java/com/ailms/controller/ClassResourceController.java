package com.ailms.controller;

import com.ailms.request.CreateClassResourceRequest;
import com.ailms.response.ApiResponse;
import com.ailms.response.ClassResourceResponse;
import com.ailms.response.PageResponse;
import com.ailms.service.IClassResourceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("${api.prefix}/classes/{classId}/resources")
@RequiredArgsConstructor
public class ClassResourceController {

    private final IClassResourceService resourceService;

    /** Tạo tài liệu lớp khi người gọi có quyền quản lý lớp. */
    @PostMapping
    @PreAuthorize("@classAccess.canManage(#classId, authentication)")
    public ResponseEntity<ApiResponse<ClassResourceResponse>> createResource(
            @PathVariable Long classId,
            @Valid @RequestBody CreateClassResourceRequest request) {
        ClassResourceResponse response = resourceService.createResource(classId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.of("Class resource created successfully", response));
    }

    /** Lấy tài liệu lớp khi người gọi có quyền xem lớp. */
    @GetMapping
    @PreAuthorize("@classAccess.canView(#classId, authentication)")
    public ResponseEntity<ApiResponse<PageResponse<ClassResourceResponse>>> getResourcesPage(
            @PathVariable Long classId,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        PageResponse<ClassResourceResponse> response = resourceService.getResourcesPage(classId, keyword, page, size);
        return ResponseEntity.ok(ApiResponse.of("Class resources retrieved successfully", response));
    }

    /** Xóa tài liệu sau khi kiểm tra resource thuộc đúng lớp trên URL. */
    @DeleteMapping("/{resourceId}")
    @PreAuthorize("@classAccess.canManageResource(#classId, #resourceId, authentication)")
    public ResponseEntity<ApiResponse<Void>> deleteResource(
            @PathVariable Long classId,
            @PathVariable Long resourceId) {
        resourceService.deleteResource(resourceId);
        return ResponseEntity.ok(ApiResponse.message("Class resource deleted successfully"));
    }

    /** Thử ingest lại một tài liệu lớp đang FAILED. */
    @PostMapping("/{resourceId}/rag/retry")
    @PreAuthorize("@classAccess.canManageResource(#classId, #resourceId, authentication)")
    public ResponseEntity<ApiResponse<ClassResourceResponse>> retryRag(
            @PathVariable Long classId,
            @PathVariable Long resourceId) {
        return ResponseEntity.accepted().body(ApiResponse.of(
                "Đã đưa tài liệu vào hàng đợi xử lý AI", resourceService.retryRag(resourceId)));
    }
}
