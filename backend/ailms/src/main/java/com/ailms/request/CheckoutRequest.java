package com.ailms.request;

import lombok.*;

import java.util.List;
import jakarta.validation.Valid;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CheckoutRequest {

    private Long userId;

    @Valid
    private List<CheckoutItemRequest> items;

    /** Gói duy nhất được mua trực tiếp từ CourseDetail. */
    private Long coursePackageId;

    /** Nhu cầu bắt buộc khi mua trực tiếp gói ONE_ON_ONE. */
    @Valid
    private OneOnOneNeedsRequest oneOnOneNeeds;

    private String couponCode;

    /** Xác nhận tiếp tục khi backend phát hiện trùng lịch lớp nhóm. */
    @Builder.Default
    private Boolean acceptScheduleConflict = false;
}
