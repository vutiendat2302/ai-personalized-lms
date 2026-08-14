package com.ailms.service.imp;

import com.ailms.client.AiServiceClient;
import com.ailms.entity.CategoryEntity;
import com.ailms.entity.CourseEntity;
import com.ailms.request.ai.AiCatalogIndexRequest;
import com.ailms.request.ai.AiCatalogIndexBatchRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.scheduling.annotation.Async;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.List;
import java.util.ArrayList;

/** Đồng bộ hồ sơ semantic của category/course sang collection catalog của Qdrant. */
@Service
@RequiredArgsConstructor
@Slf4j
public class PublicCatalogVectorService {
    private final AiServiceClient aiServiceClient;

    /** Đồng bộ embedding mô tả danh mục sau khi danh mục được tạo hoặc cập nhật. */
    @Async("aiIngestionTaskExecutor")
    public void indexCategory(CategoryEntity category) {
        if (category == null || category.getId() == null) return;
        index(AiCatalogIndexRequest.builder().sourceId(String.valueOf(category.getId())).entityType("category")
                .text(categoryText(category)).metadata(Map.of("categoryId", category.getId())).build());
    }

    /** Đồng bộ embedding khóa học sau khi nội dung hoặc trạng thái khóa học thay đổi. */
    @Async("aiIngestionTaskExecutor")
    public void indexCourse(CourseEntity course) {
        if (course == null || course.getId() == null) return;
        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put("courseId", course.getId());
        if (course.getCategoryEntity() != null) metadata.put("categoryId", course.getCategoryEntity().getId());
        index(AiCatalogIndexRequest.builder().sourceId(String.valueOf(course.getId())).entityType("course")
                .text(courseText(course)).metadata(metadata).build());
    }

    /** Backfill toàn bộ category bằng một request local-embedding batch. */
    @Async("aiIngestionTaskExecutor")
    public void indexCategories(List<CategoryEntity> categories) {
        List<AiCatalogIndexRequest> items = categories.stream().filter(item -> item.getId() != null)
                .map(item -> AiCatalogIndexRequest.builder().sourceId(String.valueOf(item.getId()))
                        .entityType("category").text(categoryText(item))
                        .metadata(Map.of("categoryId", item.getId())).build()).toList();
        sendBatches(items);
    }

    /** Backfill toàn bộ course bằng local-embedding batch, không gọi Gemini. */
    @Async("aiIngestionTaskExecutor")
    public void indexCourses(List<CourseEntity> courses) {
        List<AiCatalogIndexRequest> items = courses.stream().filter(item -> item.getId() != null)
                .map(item -> {
                    Map<String, Object> metadata = new LinkedHashMap<>();
                    metadata.put("courseId", item.getId());
                    if (item.getCategoryEntity() != null) metadata.put("categoryId", item.getCategoryEntity().getId());
                    return AiCatalogIndexRequest.builder().sourceId(String.valueOf(item.getId()))
                            .entityType("course").text(courseText(item)).metadata(metadata).build();
                }).toList();
        sendBatches(items);
    }

    /** Xóa embedding danh mục khỏi AI Service. */
    @Async("aiIngestionTaskExecutor")
    public void deleteCategory(Long categoryId) {
        delete("category", categoryId);
    }

    /** Xóa embedding khóa học khỏi AI Service. */
    @Async("aiIngestionTaskExecutor")
    public void deleteCourse(Long courseId) {
        delete("course", courseId);
    }

    /** Gửi lệnh index nhưng không làm hỏng nghiệp vụ MySQL nếu AI Service tạm thời unavailable. */
    private void index(AiCatalogIndexRequest request) {
        try {
            aiServiceClient.indexCatalog(request);
        } catch (Exception exception) {
            log.warn("Không thể đồng bộ semantic catalog {} {}: {}", request.getEntityType(),
                    request.getSourceId(), exception.getMessage());
        }
    }

    /** Gửi lệnh xóa vector và chỉ ghi log khi Qdrant chưa sẵn sàng. */
    private void delete(String entityType, Long id) {
        if (id == null) return;
        try {
            aiServiceClient.deleteCatalog(entityType, String.valueOf(id));
        } catch (Exception exception) {
            log.warn("Không thể xóa semantic catalog {} {}: {}", entityType, id, exception.getMessage());
        }
    }

    /** Chia request theo giới hạn 500 item của AI Service để không làm đầy queue. */
    private void sendBatches(List<AiCatalogIndexRequest> items) {
        for (int from = 0; from < items.size(); from += 500) {
            int to = Math.min(from + 500, items.size());
            try {
                aiServiceClient.indexCatalogBatch(AiCatalogIndexBatchRequest.builder()
                        .items(new ArrayList<>(items.subList(from, to))).build());
            } catch (Exception exception) {
                log.warn("Không thể backfill semantic catalog batch {}-{}: {}", from, to, exception.getMessage());
            }
        }
    }

    /** Tạo văn bản embedding từ các trường mô tả thật của danh mục. */
    private String categoryText(CategoryEntity category) {
        return "Danh mục: %s\nMô tả: %s".formatted(value(category.getName()), value(category.getDescription()));
    }

    /** Tạo văn bản embedding từ nội dung thật của khóa học và danh mục. */
    private String courseText(CourseEntity course) {
        String category = course.getCategoryEntity() == null ? "" : course.getCategoryEntity().getName();
        return "Khóa học: %s\nDanh mục: %s\nMô tả: %s\nMục tiêu: %s\nĐiều kiện đầu vào: %s\nTrình độ: %s"
                .formatted(value(course.getName()), value(category), value(course.getDescription()),
                        value(course.getLearningObjectives()), value(course.getPrerequisites()), course.getLevel());
    }

    /** Chuẩn hóa trường rỗng để embedding không chứa giá trị null. */
    private String value(String value) {
        return value == null ? "" : value.trim();
    }
}
