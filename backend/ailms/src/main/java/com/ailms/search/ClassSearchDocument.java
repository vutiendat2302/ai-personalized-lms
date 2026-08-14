package com.ailms.search;

import com.ailms.entity.ClassEntity;
import com.ailms.entity.enums.BaseStatusEnum;
import lombok.Builder;
import lombok.Getter;

import java.time.ZoneOffset;

/** Tài liệu phẳng được lưu trong index lớp học của Meilisearch. */
@Getter
@Builder
public class ClassSearchDocument {
    private Long id;
    private String code;
    private String name;
    private String description;
    private BaseStatusEnum status;
    private Long courseId;
    private String courseName;
    private Long categoryId;
    private String categoryName;
    private Integer maxMembers;
    private Integer currentMemberCount;
    private Long createdAtEpoch;

    /** Chuyển entity lớp học thành document phục vụ Meilisearch. */
    public static ClassSearchDocument from(ClassEntity classEntity) {
        if (classEntity == null) return null;
        return ClassSearchDocument.builder()
                .id(classEntity.getId())
                .code(classEntity.getCode())
                .name(classEntity.getName())
                .description(classEntity.getDescription())
                .status(classEntity.getStatus())
                .courseId(classEntity.getCourseEntity() == null ? null : classEntity.getCourseEntity().getId())
                .courseName(classEntity.getCourseEntity() == null ? null : classEntity.getCourseEntity().getName())
                .categoryId(classEntity.getCategoryEntity() == null ? null : classEntity.getCategoryEntity().getId())
                .categoryName(classEntity.getCategoryEntity() == null ? null : classEntity.getCategoryEntity().getName())
                .maxMembers(classEntity.getMaxMembers())
                .currentMemberCount(classEntity.getCurrentMemberCount())
                .createdAtEpoch(classEntity.getCreatedAt() == null ? null : classEntity.getCreatedAt().toInstant(ZoneOffset.UTC).toEpochMilli())
                .build();
    }
}
