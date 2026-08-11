package com.ailms.response;

import com.ailms.entity.enums.CourseStatusEnum;
import com.ailms.entity.enums.DeliveryModeEnum;
import lombok.*;

import java.util.List;

/** Phản hồi tổng hợp duy nhất phục vụ trang chi tiết khóa học công khai. */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CourseDetailResponse {
    private Long id;
    private String code;
    private String name;
    private String link;
    private String description;
    private String thumbnailUrl;
    private String learningObjectives;
    private String prerequisites;
    private String level;
    private CourseStatusEnum status;
    private Category category;
    private Creator creator;
    private CourseCurriculumResponse curriculum;
    private List<PackageItem> packages;
    private EnrollmentAccess enrollment;

    /** Danh mục khóa học. */
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Category {
        private Long id;
        private String name;
    }

    /** Người tạo và biên soạn khóa học. */
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Creator {
        private Long id;
        private String fullName;
        private String avatarUrl;
        private String title;
        private String bio;
    }

    /** Gói học đang mở bán cùng trạng thái sở hữu/mua thêm. */
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PackageItem {
        private Long id;
        private String code;
        private String name;
        private String description;
        private DeliveryModeEnum deliveryMode;
        private java.math.BigDecimal price;
        private java.math.BigDecimal originalPrice;
        private Integer durationDays;
        private Integer includedTutorSessions;
        private Integer maxGroupSize;
        private CourseClassDetailResponse classDetail;
        private Boolean owned;
        private Boolean purchasable;
        private String unavailableReason;
    }

    /** Quyền học và danh sách gói hiện sở hữu của người dùng hiện tại. */
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class EnrollmentAccess {
        private Long enrollmentId;
        private Boolean authenticated;
        private Boolean hasCourseAccess;
        private List<Long> ownedPackageIds;
        private List<Long> purchasablePackageIds;
    }
}
