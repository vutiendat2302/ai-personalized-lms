package com.ailms.response;

import com.ailms.entity.enums.DeliveryModeEnum;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

/** Khóa học đang mở bán được cá nhân hóa cho học viên. */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentCatalogCourseResponse {
    private Long id;
    private String title;
    private String categoryName;
    private String description;
    private String thumbnailUrl;
    private double rating;
    private int reviewCount;
    private int enrollmentCount;
    private BigDecimal originalPrice;
    private BigDecimal sellingPrice;
    private boolean enrolled;
    private boolean personalized;
    private List<PackageItem> packages;

    /** Gói học đang mở bán thuộc khóa học. */
    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PackageItem {
        private Long id;
        private String name;
        private DeliveryModeEnum deliveryMode;
        private BigDecimal price;
    }
}
