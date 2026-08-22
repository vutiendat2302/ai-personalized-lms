package com.ailms.service;

import com.ailms.request.CreateClassResourceRequest;
import com.ailms.response.ClassResourceResponse;
import com.ailms.response.PageResponse;

public interface IClassResourceService {
    /** Tạo resource mới cho lớp và bắt đầu ingestion RAG. */
    ClassResourceResponse createResource(Long classId, CreateClassResourceRequest request);
    /** Lấy resource lớp theo trang và từ khóa. */
    PageResponse<ClassResourceResponse> getResourcesPage(Long classId, String keyword, int page, int size);
    /** Xóa resource lớp cùng source vector tương ứng. */
    void deleteResource(Long resourceId);

    /** Đưa resource về PENDING và phát sự kiện ingest lại sau commit. */
    ClassResourceResponse retryRag(Long resourceId);
}
