package com.ailms.search;

import com.ailms.entity.UserEntity;
import com.ailms.entity.enums.UserStatusEnum;
import com.ailms.request.UserSearchRequest;
import com.ailms.response.UserResponse;
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

/** Đồng bộ và tìm kiếm index người dùng trên Meilisearch, có fallback ở service nghiệp vụ. */
@Service
@RequiredArgsConstructor
@Slf4j
public class MeilisearchUserService {
    private final RestClient client;
    private final ObjectMapper objectMapper;

    @Value("${meilisearch.enabled:true}")
    private boolean enabled;

    @Value("${meilisearch.user-index:users}")
    private String indexName;

    /** Kiểm tra xem Meilisearch integration có được kích hoạt hay không. */
    public boolean isEnabled() {
        return enabled;
    }

    /** Tìm kiếm người dùng qua full-text search Meilisearch và trả về PageResponse. */
    public PageResponse<UserResponse> search(UserSearchRequest request) {
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
            List<UserResponse> content = result == null ? List.of() : toResponses(result.path("hits"));
            long total = result == null ? 0 : result.path("estimatedTotalHits").asLong(content.size());
            return PageResponse.<UserResponse>builder().content(content).pageNumber(page).pageSize(size)
                    .totalElements(total).totalPages((int) Math.ceil((double) total / size))
                    .first(page == 0).last((page + 1L) * size >= total).build();
        } catch (RestClientException | IllegalArgumentException exception) {
            log.warn("Meilisearch user search unavailable, using MySQL fallback: {}", exception.getMessage());
            return null;
        }
    }

    /** Ghi hoặc cập nhật người dùng trong index. */
    public void index(UserEntity user) {
        if (!enabled || user == null || user.getId() == null) return;
        try {
            client.post().uri(uriBuilder -> uriBuilder.path("/indexes/{index}/documents")
                            .queryParam("primaryKey", "id").build(indexName))
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(List.of(UserSearchDocument.from(user))).retrieve().toBodilessEntity();
        } catch (RestClientException exception) {
            log.warn("Could not index user {} in Meilisearch: {}", user.getId(), exception.getMessage());
        }
    }

    /** Xóa người dùng khỏi index khi bị xóa. */
    public void delete(Long userId) {
        if (!enabled || userId == null) return;
        try {
            client.delete().uri("/indexes/{index}/documents/{id}", indexName, userId).retrieve().toBodilessEntity();
        } catch (RestClientException exception) {
            log.warn("Could not remove user {} from Meilisearch: {}", userId, exception.getMessage());
        }
    }

    /** Cấu hình thuộc tính searchable, filterable và sortable cho index người dùng. */
    public void configureIndex() {
        if (!enabled) return;
        try {
            client.patch().uri("/indexes/{index}/settings", indexName).contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of(
                            "searchableAttributes", List.of("username", "email", "fullName", "phone"),
                            "filterableAttributes", List.of("status", "gender", "createdAtEpoch"),
                            "sortableAttributes", List.of("createdAtEpoch")
                    ))
                    .retrieve().toBodilessEntity();
        } catch (RestClientException exception) {
            log.warn("Could not configure Meilisearch user index: {}", exception.getMessage());
        }
    }

    /** Xây dựng chuỗi filter an toàn từ UserSearchRequest. */
    private String buildFilter(UserSearchRequest request) {
        StringBuilder filter = new StringBuilder();
        if (request.getStatus() != null) {
            appendFilter(filter, "status", "= " + quote(request.getStatus().name()));
        } else {
            appendFilter(filter, "status", "!= " + quote(UserStatusEnum.DELETED.name()));
        }
        if (request.getGender() != null) {
            appendFilter(filter, "gender", "= " + request.getGender());
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

    /** Chuyển đổi JSON hits thành List UserResponse. */
    private List<UserResponse> toResponses(JsonNode hits) {
        return objectMapper.convertValue(hits, new TypeReference<List<UserResponse>>() { });
    }
}
