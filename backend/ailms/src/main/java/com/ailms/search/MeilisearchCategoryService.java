package com.ailms.search;

import com.ailms.entity.CategoryEntity;
import com.ailms.entity.enums.BaseStatusEnum;
import com.ailms.request.CategorySearchRequest;
import com.ailms.response.CategoryResponse;
import com.ailms.response.PageResponse;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.List;
import java.util.Map;

/** Đồng bộ và tìm kiếm index danh mục trên Meilisearch, có fallback ở service nghiệp vụ. */
@Service
@RequiredArgsConstructor
@Slf4j
public class MeilisearchCategoryService {
    private final RestClient client;
    private final ObjectMapper objectMapper;

    @Value("${meilisearch.enabled:true}")
    private boolean enabled;

    @Value("${meilisearch.category-index:categories}")
    private String indexName;

    /** Kiểm tra xem Meilisearch integration có được kích hoạt hay không. */
    public boolean isEnabled() {
        return enabled;
    }

    /** Tìm kiếm danh mục qua full-text search Meilisearch và trả về PageResponse. */
    public PageResponse<CategoryResponse> search(CategorySearchRequest request) {
        if (!enabled) return null;
        int page = request.toPageable().getPageNumber();
        int size = request.toPageable().getPageSize();
        String filter = buildFilter(request);
        Map<String, Object> body = Map.of(
                "q", request.getKeyword() == null ? "" : request.getKeyword().trim(),
                "offset", page * size,
                "limit", size,
                "filter", filter,
                "sort", List.of("createdAtEpoch:desc"));
        try {
            JsonNode result = client.post().uri("/indexes/{index}/search", indexName)
                    .contentType(MediaType.APPLICATION_JSON).body(body).retrieve().body(JsonNode.class);
            List<CategoryResponse> content = result == null ? List.of() : toResponses(result.path("hits"));
            long total = result == null ? 0 : result.path("estimatedTotalHits").asLong(content.size());
            return PageResponse.<CategoryResponse>builder().content(content).pageNumber(page).pageSize(size)
                    .totalElements(total).totalPages((int) Math.ceil((double) total / size))
                    .first(page == 0).last((page + 1L) * size >= total).build();
        } catch (RestClientException | IllegalArgumentException exception) {
            log.warn("Meilisearch category search unavailable, using MySQL fallback: {}", exception.getMessage());
            return null;
        }
    }

    /** Ghi hoặc cập nhật danh mục trong index. */
    public void index(CategoryEntity category) {
        if (!enabled || category == null || category.getId() == null) return;
        try {
            client.post().uri(uriBuilder -> uriBuilder.path("/indexes/{index}/documents")
                            .queryParam("primaryKey", "id").build(indexName))
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(List.of(CategorySearchDocument.from(category))).retrieve().toBodilessEntity();
        } catch (RestClientException exception) {
            log.warn("Could not index category {} in Meilisearch: {}", category.getId(), exception.getMessage());
        }
    }

    /** Xóa danh mục khỏi index khi bị xóa. */
    public void delete(Long categoryId) {
        if (!enabled || categoryId == null) return;
        try {
            client.delete().uri("/indexes/{index}/documents/{id}", indexName, categoryId).retrieve().toBodilessEntity();
        } catch (RestClientException exception) {
            log.warn("Could not remove category {} from Meilisearch: {}", categoryId, exception.getMessage());
        }
    }

    /** Cấu hình thuộc tính searchable, filterable và sortable cho index danh mục. */
    public void configureIndex() {
        if (!enabled) return;
        try {
            client.patch().uri("/indexes/{index}/settings", indexName).contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of(
                            "searchableAttributes", List.of("name", "description"),
                            "filterableAttributes", List.of("status", "createdAtEpoch"),
                            "sortableAttributes", List.of("createdAtEpoch")
                    ))
                    .retrieve().toBodilessEntity();
        } catch (RestClientException exception) {
            log.warn("Could not configure Meilisearch category index: {}", exception.getMessage());
        }
    }

    /** Xây dựng chuỗi filter an toàn từ CategorySearchRequest. */
    private String buildFilter(CategorySearchRequest request) {
        StringBuilder filter = new StringBuilder();
        if (request.getStatus() != null) {
            appendFilter(filter, "status", "= " + quote(request.getStatus().name()));
        }
        if (request.getCreatedFrom() != null) {
            appendFilter(filter, "createdAtEpoch", ">= " + request.getCreatedFrom().toInstant(java.time.ZoneOffset.UTC).toEpochMilli());
        }
        if (request.getCreatedTo() != null) {
            appendFilter(filter, "createdAtEpoch", "<= " + request.getCreatedTo().toInstant(java.time.ZoneOffset.UTC).toEpochMilli());
        }
        return filter.toString();
    }

    /** Nối điều kiện filter. */
    private void appendFilter(StringBuilder filter, String field, String condition) {
        if (condition != null) {
            if (filter.length() > 0) filter.append(" AND ");
            filter.append(field).append(' ').append(condition);
        }
    }

    /** Quote chuỗi literal dùng trong Meilisearch filter. */
    private String quote(String value) {
        return "'" + value.replace("'", "\\'") + "'";
    }

    /** Chuyển đổi JSON hits thành List CategoryResponse. */
    private List<CategoryResponse> toResponses(JsonNode hits) {
        return objectMapper.convertValue(hits, new TypeReference<List<CategoryResponse>>() { });
    }
}
