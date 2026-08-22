package com.ailms.service;

import com.ailms.response.SalesDailyRevenueResponse;
import com.ailms.response.SalesKpiResponse;
import com.ailms.response.SalesTopPackageResponse;
import com.ailms.response.SalesUrgentTaskResponse;

import java.util.List;

/** Cung cấp các thống kê bán hàng được tổng hợp hoàn toàn từ dữ liệu nghiệp vụ thật. */
public interface ISalesDashboardService {
    /** Tổng hợp KPI doanh thu, đơn hàng, hoàn tiền và giao dịch của tháng hiện tại. */
    SalesKpiResponse getKpi();

    /** Tổng hợp doanh thu thực nhận theo từng ngày trong 30 ngày gần nhất. */
    List<SalesDailyRevenueResponse> getDailyRevenue();

    /** Xếp hạng tối đa năm gói học theo doanh thu từ đơn đã thanh toán. */
    List<SalesTopPackageResponse> getTopPackages();

    /** Liệt kê các đơn hoặc giao dịch thật cần bộ phận sales xử lý. */
    List<SalesUrgentTaskResponse> getUrgentTasks();
}
