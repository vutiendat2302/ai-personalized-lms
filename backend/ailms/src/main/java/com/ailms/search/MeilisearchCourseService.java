package com.ailms.search;

import com.ailms.entity.CourseEntity;
import com.ailms.entity.enums.CourseStatusEnum;
import com.ailms.request.CourseSearchRequest;
import com.ailms.response.CourseResponse;
import com.ailms.response.PageResponse;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.List;
import tools.jackson.core.type.TypeReference;

import java.util.Map;
import java.text.Normalizer;
import java.util.Locale;

/** Đồng bộ và tìm kiếm index khóa học, có fallback ở service nghiệp vụ khi engine unavailable. */
@Service
@RequiredArgsConstructor
@Slf4j
public class MeilisearchCourseService {
    private final RestClient client;
    private final ObjectMapper objectMapper;

    @Value("${meilisearch.enabled:true}")
    private boolean enabled;

    @Value("${meilisearch.course-index:courses}")
    private String indexName;

    /** Cho biết integration có được bật để tránh đồng bộ index không cần thiết khi chạy local. */
    public boolean isEnabled() {
        return enabled;
    }

    /** Tìm khóa học bằng full-text search và giữ nguyên shape phân trang của API hiện tại. */
    public PageResponse<CourseResponse> search(CourseSearchRequest request) {
        if (!enabled) return null;
        int page = request.toPageable().getPageNumber();
        int size = request.toPageable().getPageSize();
        String filter = buildFilter(request);
        Map<String, Object> body = Map.of(
                "q", normalizeKeyword(request.getKeyword()),
                "matchingStrategy", "all",
                "offset", page * size,
                "limit", size,
                "filter", filter,
                "sort", List.of("trendingScore:desc", "createdAtEpoch:desc"));
        try {
            JsonNode result = client.post().uri("/indexes/{index}/search", indexName)
                    .contentType(MediaType.APPLICATION_JSON).body(body).retrieve().body(JsonNode.class);
            List<CourseResponse> content = result == null ? List.of() : toResponses(result.path("hits"));
            long total = result == null ? 0 : result.path("estimatedTotalHits").asLong(content.size());
            return PageResponse.<CourseResponse>builder().content(content).pageNumber(page).pageSize(size)
                    .totalElements(total).totalPages((int) Math.ceil((double) total / size))
                    .first(page == 0).last((page + 1L) * size >= total).build();
        } catch (RestClientException | IllegalArgumentException exception) {
            log.warn("Meilisearch course search unavailable, using MySQL fallback: {}", exception.getMessage());
            return null;
        }
    }

    /** Trả về kết quả autocomplete tên/mã khóa học cho thanh tìm kiếm toàn cục. */
    public List<CourseResponse> suggestions(String keyword, int limit) {
        if (!enabled || keyword == null || keyword.trim().length() < 2) return List.of();
        CourseSearchRequest request = new CourseSearchRequest();
        request.setKeyword(keyword);
        request.setStatus(CourseStatusEnum.ACTIVE);
        request.setPage(0);
        request.setSize(Math.min(Math.max(limit, 1), 20));
        PageResponse<CourseResponse> result = search(request);
        return result == null ? List.of() : result.getContent();
    }

    /** Ghi hoặc cập nhật một khóa học trong index; lỗi đồng bộ chỉ được ghi log. */
    public void index(CourseEntity course, boolean activeForSale) {
        if (!enabled || course == null || course.getId() == null) return;
        try {
            client.post().uri(uriBuilder -> uriBuilder.path("/indexes/{index}/documents")
                            .queryParam("primaryKey", "id").build(indexName))
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(List.of(CourseSearchDocument.from(course, activeForSale))).retrieve().toBodilessEntity();
        } catch (RestClientException exception) {
            log.warn("Could not index course {} in Meilisearch: {}", course.getId(), exception.getMessage());
        }
    }

    /** Xóa tài liệu khỏi index khi khóa học bị xóa mềm hoặc bị loại khỏi hệ thống. */
    public void delete(Long courseId) {
        if (!enabled || courseId == null) return;
        try {
            client.delete().uri("/indexes/{index}/documents/{id}", indexName, courseId).retrieve().toBodilessEntity();
        } catch (RestClientException exception) {
            log.warn("Could not remove course {} from Meilisearch: {}", courseId, exception.getMessage());
        }
    }

    /** Cấu hình các trường dùng trong filter và tìm kiếm của index khóa học. */
    public void configureIndex() {
        if (!enabled) return;
        try {
            client.patch().uri("/indexes/{index}/settings", indexName).contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("searchableAttributes", List.of("searchText", "name", "code", "description", "categoryName", "learningObjectives", "prerequisites"),
                            "filterableAttributes", List.of("status", "categoryId", "level", "createdBy", "createdAtEpoch", "activeForSale"),
                            "sortableAttributes", List.of("trendingScore", "createdAtEpoch", "avgRating", "enrollmentCount")))
                    .retrieve().toBodilessEntity();
        } catch (RestClientException exception) {
            log.warn("Could not configure Meilisearch course index: {}", exception.getMessage());
        }
    }

    /** Tạo biểu thức filter an toàn cho các bộ lọc đang có của CourseSearchRequest. */
    private String buildFilter(CourseSearchRequest request) {
        StringBuilder filter = new StringBuilder();
        appendFilter(filter, "status", request.getStatus() == null ? "!= " + quote(CourseStatusEnum.DELETED.name()) : "= " + quote(request.getStatus().name()));
        appendFilter(filter, "categoryId", request.getCategoryId() == null ? null : "= " + request.getCategoryId());
        appendFilter(filter, "level", request.getLevel() == null ? null : "= " + quote(request.getLevel().name()));
        appendFilter(filter, "createdBy", request.getCreatedBy() == null ? null : "= " + request.getCreatedBy());
        if (request.getStatus() == CourseStatusEnum.ACTIVE) appendFilter(filter, "activeForSale", "= true");
        if (request.getCreatedFrom() != null) appendFilter(filter, "createdAtEpoch", ">= " + request.getCreatedFrom().toInstant(java.time.ZoneOffset.UTC).toEpochMilli());
        if (request.getCreatedTo() != null) appendFilter(filter, "createdAtEpoch", "<= " + request.getCreatedTo().toInstant(java.time.ZoneOffset.UTC).toEpochMilli());
        return filter.toString();
    }

    /** Nối một điều kiện filter vào biểu thức Meilisearch hiện tại. */
    private void appendFilter(StringBuilder filter, String field, String condition) {
        if (condition != null) {
            if (filter.length() > 0) filter.append(" AND ");
            filter.append(field).append(' ').append(condition);
        }
    }

    /** Escape chuỗi literal dùng trong filter của Meilisearch. */
    private String quote(String value) {
        return "'" + value.replace("'", "\\'") + "'";
    }

    /** Chuyển danh sách hit JSON thành DTO response của API. */
    private List<CourseResponse> toResponses(JsonNode hits) {
        normalizeDateFields(hits);
        return objectMapper.convertValue(hits, new TypeReference<List<CourseResponse>>() { });
    }

    /** Cắt phần microseconds mà Meilisearch trả về để tương thích LocalDateTime của API. */
    private void normalizeDateFields(JsonNode hits) {
        if (hits == null || !hits.isArray()) return;
        for (JsonNode hit : hits) {
            if (hit instanceof ObjectNode object) {
                truncateDate(object, "createdAt");
                truncateDate(object, "updatedAt");
            }
        }
    }

    /** Chuẩn hóa một trường thời gian ISO về độ chính xác đến giây. */
    private void truncateDate(ObjectNode object, String field) {
        JsonNode value = object.get(field);
        if (value != null && value.isString() && value.asString().length() > 19) {
            object.put(field, value.asString().substring(0, 19));
        }
    }

    /** Chuẩn hóa truy vấn để hỗ trợ tìm kiếm không dấu từ thanh Header. */
    private String normalizeKeyword(String keyword) {
        if (keyword == null) return "";
        return Normalizer.normalize(keyword.trim(), Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "")
                .toLowerCase(Locale.ROOT);
    }
}
