package com.ailms.search;

import com.ailms.entity.CourseEntity;
import com.ailms.entity.enums.CourseStatusEnum;
import lombok.Builder;
import lombok.Getter;

import java.time.ZoneOffset;
import java.time.LocalDateTime;
import java.text.Normalizer;
import java.util.Locale;
import java.util.Objects;
import java.util.stream.Collectors;

/** Tài liệu phẳng được lưu trong index khóa học của Meilisearch. */
@Getter
@Builder
public class CourseSearchDocument {
    private Long id;
    private String code;
    private String name;
    private String link;
    private String description;
    private String thumbnailUrl;
    private String learningObjectives;
    private String prerequisites;
    private java.math.BigDecimal suggestedPrice;
    private String level;
    private CourseStatusEnum status;
    private Long categoryId;
    private String categoryName;
    private String searchText;
    private Long createdBy;
    private Long createdAtEpoch;
    private LocalDateTime createdAt;
    private Boolean activeForSale;
    private Double avgRating;
    private Integer reviewCount;
    private Integer viewCount;
    private Integer enrollmentCount;
    private Double trendingScore;

    /** Chuyển entity khóa học và trạng thái gói bán thành document độc lập với JPA. */
    public static CourseSearchDocument from(CourseEntity course, boolean activeForSale) {
        String searchText = java.util.stream.Stream.of(
                        course.getCode(), course.getName(), course.getDescription(),
                        course.getLearningObjectives(), course.getPrerequisites(),
                        course.getCategoryEntity() == null ? null : course.getCategoryEntity().getName())
                .filter(Objects::nonNull)
                .map(CourseSearchDocument::normalize)
                .collect(Collectors.joining(" "));

        return CourseSearchDocument.builder()
                .id(course.getId())
                .code(course.getCode())
                .name(course.getName())
                .link(course.getLink())
                .description(course.getDescription())
                .thumbnailUrl(course.getThumbnailUrl())
                .learningObjectives(course.getLearningObjectives())
                .prerequisites(course.getPrerequisites())
                .suggestedPrice(course.getSuggestedPrice())
                .level(course.getLevel() == null ? null : course.getLevel().name())
                .status(course.getStatus())
                .categoryId(course.getCategoryEntity() == null ? null : course.getCategoryEntity().getId())
                .categoryName(course.getCategoryEntity() == null ? null : course.getCategoryEntity().getName())
                .searchText(searchText)
                .createdBy(course.getCreatedBy())
                .createdAtEpoch(course.getCreatedAt() == null ? null : course.getCreatedAt().toInstant(ZoneOffset.UTC).toEpochMilli())
                .createdAt(course.getCreatedAt())
                .activeForSale(activeForSale)
                .avgRating(course.getAvgRating())
                .reviewCount(course.getReviewCount())
                .viewCount(course.getViewCount())
                .enrollmentCount(course.getEnrollmentCount())
                .trendingScore(course.getTrendingScore())
                .build();
    }

    /** Chuẩn hóa tiếng Việt không dấu để tìm kiếm "toan" khớp "Toán". */
    private static String normalize(String value) {
        return Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "")
                .toLowerCase(Locale.ROOT);
    }
}
