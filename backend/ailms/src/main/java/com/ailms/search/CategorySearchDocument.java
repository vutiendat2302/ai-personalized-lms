package com.ailms.search;

import com.ailms.entity.CategoryEntity;
import com.ailms.entity.enums.BaseStatusEnum;
import lombok.Builder;
import lombok.Getter;

import java.time.ZoneOffset;

/** Tài liệu phẳng được lưu trong index danh mục của Meilisearch. */
@Getter
@Builder
public class CategorySearchDocument {
    private Long id;
    private String name;
    private String description;
    private BaseStatusEnum status;
    private Long createdAtEpoch;

    /** Chuyển entity danh mục thành document phục vụ Meilisearch. */
    public static CategorySearchDocument from(CategoryEntity category) {
        if (category == null) return null;
        return CategorySearchDocument.builder()
                .id(category.getId())
                .name(category.getName())
                .description(category.getDescription())
                .status(category.getStatus())
                .createdAtEpoch(category.getCreatedAt() == null ? null : category.getCreatedAt().toInstant(ZoneOffset.UTC).toEpochMilli())
                .build();
    }
}
