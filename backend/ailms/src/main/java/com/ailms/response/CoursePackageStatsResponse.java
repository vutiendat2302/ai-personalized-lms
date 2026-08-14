package com.ailms.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** Tổng hợp số lượng gói bán theo các trạng thái quản trị. */
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CoursePackageStatsResponse {
    private long totalPackages;
    private long activePackages;
    private long outOfStockPackages;
    private long inactivePackages;
}
