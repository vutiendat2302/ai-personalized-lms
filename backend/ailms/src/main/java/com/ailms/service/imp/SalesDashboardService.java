package com.ailms.service.imp;

import com.ailms.entity.OrderEntity;
import com.ailms.entity.OrderItemEntity;
import com.ailms.entity.PaymentTransactionEntity;
import com.ailms.entity.UserEntity;
import com.ailms.entity.enums.OrderStatusEnum;
import com.ailms.entity.enums.PaymentTransactionStatusEnum;
import com.ailms.repository.CouponRepository;
import com.ailms.repository.OrderItemRepository;
import com.ailms.repository.OrderRepository;
import com.ailms.repository.PaymentTransactionRepository;
import com.ailms.response.SalesDailyRevenueResponse;
import com.ailms.response.SalesKpiResponse;
import com.ailms.response.SalesTopPackageResponse;
import com.ailms.response.SalesUrgentTaskResponse;
import com.ailms.service.ISalesDashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SalesDashboardService implements ISalesDashboardService {
    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final PaymentTransactionRepository paymentTransactionRepository;
    private final CouponRepository couponRepository;

    /** Tổng hợp KPI từ order và payment theo mốc paidAt/refundedAt thực tế. */
    @Override
    public SalesKpiResponse getKpi() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime today = now.toLocalDate().atStartOfDay();
        LocalDateTime monthStart = YearMonth.from(now).atDay(1).atStartOfDay();
        LocalDateTime previousMonthStart = monthStart.minusMonths(1);
        List<OrderEntity> orders = orderRepository.findAll();
        List<PaymentTransactionEntity> payments = paymentTransactionRepository.findAll();

        BigDecimal todayRevenue = netRevenue(payments, today, now);
        BigDecimal yesterdayRevenue = netRevenue(payments, today.minusDays(1), today);
        BigDecimal monthRevenue = netRevenue(payments, monthStart, now);
        BigDecimal previousMonthRevenue = netRevenue(payments, previousMonthStart, monthStart);
        BigDecimal allTimeRevenue = netRevenue(payments, null, null);
        int successfulOrders = (int) orders.stream().filter(o -> o.getStatus() == OrderStatusEnum.PAID && inRange(o.getPaidAt(), monthStart, now)).count();
        int refundedOrders = (int) orders.stream().filter(o -> o.getStatus() == OrderStatusEnum.REFUNDED && inRange(refundedAt(o, payments), monthStart, now)).count();
        BigDecimal refundedAmount = payments.stream()
                .filter(p -> p.getStatus() == PaymentTransactionStatusEnum.REFUNDED && inRange(p.getRefundedAt(), monthStart, now))
                .map(p -> value(p.getRefundAmount())).reduce(BigDecimal.ZERO, BigDecimal::add);
        int failedPayments = (int) payments.stream().filter(p -> p.getStatus() == PaymentTransactionStatusEnum.FAILED && inRange(p.getCreatedAt(), monthStart, now)).count();
        int monthOrders = (int) orders.stream().filter(o -> inRange(o.getCreatedAt(), monthStart, now)).count();
        int pendingOrders = (int) orders.stream().filter(o -> o.getStatus() == OrderStatusEnum.PENDING).count();
        int expiringCoupons = (int) couponRepository.findAll().stream()
                .filter(c -> c.getMaxUsage() != null && c.getMaxUsage() > 0 && c.getUsedCount() != null
                        && (double) c.getUsedCount() / c.getMaxUsage() >= 0.9).count();

        return SalesKpiResponse.builder()
                .todayRevenue(todayRevenue).revenueChangePercent(change(todayRevenue, yesterdayRevenue))
                .monthRevenue(monthRevenue).monthRevenueChangePercent(change(monthRevenue, previousMonthRevenue))
                .allTimeRevenue(allTimeRevenue)
                .successfulOrdersCount(successfulOrders).refundedOrdersCount(refundedOrders)
                .refundedAmount(refundedAmount).failedPaymentsCount(failedPayments)
                .averageOrderValue(successfulOrders == 0 ? BigDecimal.ZERO : monthRevenue.divide(BigDecimal.valueOf(successfulOrders), 2, RoundingMode.HALF_UP))
                .pendingOrdersCount(pendingOrders).isPendingWarning(pendingOrders >= 5)
                .conversionRate(monthOrders == 0 ? 0D : roundPercent((double) successfulOrders * 100 / monthOrders))
                .expiringCouponsCount(expiringCoupons).build();
    }

    /** Tạo chuỗi 30 ngày liên tục, ngày không phát sinh giao dịch trả đúng doanh thu 0. */
    @Override
    public List<SalesDailyRevenueResponse> getDailyRevenue() {
        LocalDate today = LocalDate.now();
        List<PaymentTransactionEntity> payments = paymentTransactionRepository.findAll();
        List<SalesDailyRevenueResponse> result = new ArrayList<>();
        for (int offset = 29; offset >= 0; offset--) {
            LocalDate date = today.minusDays(offset);
            List<PaymentTransactionEntity> daily = payments.stream().filter(p -> p.getPaidAt() != null
                    && p.getPaidAt().toLocalDate().equals(date)).toList();
            BigDecimal refunds = payments.stream().filter(p -> p.getRefundedAt() != null
                    && p.getRefundedAt().toLocalDate().equals(date)).map(p -> value(p.getRefundAmount()))
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            result.add(SalesDailyRevenueResponse.builder().date(date.toString())
                    .revenue(daily.stream().filter(p -> p.getStatus() == PaymentTransactionStatusEnum.SUCCESS || p.getStatus() == PaymentTransactionStatusEnum.REFUNDED)
                            .map(p -> value(p.getAmount())).reduce(BigDecimal.ZERO, BigDecimal::add).subtract(refunds))
                    .ordersCount((int) daily.stream().map(p -> p.getOrderEntity().getId()).distinct().count()).build());
        }
        return result;
    }

    /** Gom doanh thu theo snapshot dòng hàng để không bị ảnh hưởng khi giá gói thay đổi. */
    @Override
    public List<SalesTopPackageResponse> getTopPackages() {
        Map<Long, SalesTopPackageResponse> grouped = new LinkedHashMap<>();
        orderItemRepository.findAll().stream().filter(i -> i.getOrderEntity().getStatus() == OrderStatusEnum.PAID).forEach(item -> {
            Long id = item.getCoursePackageEntity().getId();
            SalesTopPackageResponse stat = grouped.computeIfAbsent(id, ignored -> new SalesTopPackageResponse(
                    String.valueOf(id), item.getCoursePackageEntity().getName(), 0L, BigDecimal.ZERO));
            stat.setSalesCount(stat.getSalesCount() + 1);
            stat.setRevenue(stat.getRevenue().add(value(item.getFinalPrice())));
        });
        return grouped.values().stream().sorted(Comparator.comparing(SalesTopPackageResponse::getRevenue).reversed()).limit(5).toList();
    }

    /** Phát hiện đơn sắp hết hạn, payment lỗi và đơn đã trả tiền nhưng thiếu enrollment. */
    @Override
    public List<SalesUrgentTaskResponse> getUrgentTasks() {
        LocalDateTime now = LocalDateTime.now();
        List<SalesUrgentTaskResponse> tasks = new ArrayList<>();
        orderRepository.findAll().stream().filter(o -> o.getStatus() == OrderStatusEnum.PENDING && o.getExpiredAt() != null
                && !o.getExpiredAt().isBefore(now) && o.getExpiredAt().isBefore(now.plusHours(24))).forEach(o -> tasks.add(task(o, "EXPIRING_PENDING", "Đơn hàng sắp hết hạn thanh toán", "Hết hạn lúc " + o.getExpiredAt())));
        paymentTransactionRepository.findAll().stream().filter(p -> p.getStatus() == PaymentTransactionStatusEnum.FAILED
                && p.getCreatedAt() != null && p.getCreatedAt().isAfter(now.minusDays(7))).forEach(p -> tasks.add(task(p.getOrderEntity(), "FAILED_PAYMENT", "Giao dịch " + p.getPaymentMethod() + " thất bại", "Cần liên hệ học viên để hỗ trợ thanh toán")));
        orderItemRepository.findAll().stream().filter(i -> i.getOrderEntity().getStatus() == OrderStatusEnum.PAID && i.getRelatedEnrollment() == null)
                .map(OrderItemEntity::getOrderEntity).distinct().forEach(o -> tasks.add(task(o, "PAID_NO_ENROLLMENT", "Đơn đã thanh toán nhưng chưa kích hoạt gói", "Cần kiểm tra quy trình tạo enrollment")));
        return tasks.stream().sorted(Comparator.comparing(SalesUrgentTaskResponse::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder()))).limit(20).toList();
    }

    /** Tính doanh thu giao dịch thành công trong khoảng trái đóng, phải mở. */
    private BigDecimal netRevenue(List<PaymentTransactionEntity> payments, LocalDateTime from, LocalDateTime to) {
        BigDecimal paid = payments.stream()
                .filter(p -> (p.getStatus() == PaymentTransactionStatusEnum.SUCCESS || p.getStatus() == PaymentTransactionStatusEnum.REFUNDED)
                        && inRangeOrUnbounded(p.getPaidAt(), from, to))
                .map(p -> value(p.getAmount())).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal refunded = payments.stream().filter(p -> inRangeOrUnbounded(p.getRefundedAt(), from, to))
                .map(p -> value(p.getRefundAmount())).reduce(BigDecimal.ZERO, BigDecimal::add);
        return paid.subtract(refunded);
    }

    /** Chuẩn hóa một tác vụ khẩn từ dữ liệu đơn hàng thật. */
    private SalesUrgentTaskResponse task(OrderEntity order, String type, String title, String subtitle) {
        UserEntity user = order.getUserEntity();
        return SalesUrgentTaskResponse.builder().id(type + "-" + order.getId()).type(type).title(title).subtitle(subtitle)
                .amount(value(order.getFinalAmount())).orderId(String.valueOf(order.getId()))
                .studentName(user == null ? "Chưa cập nhật" : user.getFullName())
                .studentEmail(user == null ? null : user.getEmail()).studentPhone(user == null ? null : user.getPhone())
                .expiredAt(order.getExpiredAt()).createdAt(order.getCreatedAt()).build();
    }

    /** Tìm thời điểm hoàn tiền của order từ giao dịch liên quan. */
    private LocalDateTime refundedAt(OrderEntity order, List<PaymentTransactionEntity> payments) {
        return payments.stream().filter(p -> p.getOrderEntity().getId().equals(order.getId()) && p.getRefundedAt() != null)
                .map(PaymentTransactionEntity::getRefundedAt).max(LocalDateTime::compareTo).orElse(null);
    }

    /** Kiểm tra thời điểm nằm trong khoảng thống kê. */
    private boolean inRange(LocalDateTime value, LocalDateTime from, LocalDateTime to) {
        return value != null && !value.isBefore(from) && value.isBefore(to);
    }

    /** Kiểm tra thời điểm theo khoảng tùy chọn, dùng cho tổng doanh thu toàn thời gian. */
    private boolean inRangeOrUnbounded(LocalDateTime value, LocalDateTime from, LocalDateTime to) {
        return value != null && (from == null || !value.isBefore(from)) && (to == null || value.isBefore(to));
    }

    /** Trả về 0 khi trường tiền chưa có dữ liệu. */
    private BigDecimal value(BigDecimal amount) { return amount == null ? BigDecimal.ZERO : amount; }

    /** Tính phần trăm thay đổi, kỳ trước bằng 0 được quy ước 0 để tránh số liệu gây hiểu nhầm. */
    private double change(BigDecimal current, BigDecimal previous) {
        return previous.signum() == 0 ? 0D : current.subtract(previous).multiply(BigDecimal.valueOf(100)).divide(previous, 1, RoundingMode.HALF_UP).doubleValue();
    }

    /** Làm tròn tỷ lệ phần trăm đến một chữ số thập phân. */
    private double roundPercent(double value) { return Math.round(value * 10D) / 10D; }
}
