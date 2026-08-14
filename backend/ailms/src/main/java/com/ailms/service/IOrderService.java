package com.ailms.service;

import com.ailms.request.CheckoutRequest;
import com.ailms.request.OneOnOneNeedsRequest;
import com.ailms.request.RefundRequest;
import com.ailms.response.CheckoutPaymentResponse;
import com.ailms.response.OrderResponse;
import com.ailms.response.OrderStatusResponse;
import com.ailms.response.TutorScheduleCheckResponse;

import java.util.List;

/**
 * Service quản lý đơn hàng, xử lý thanh toán, hoàn tiền và đối soát giao dịch.
 */
public interface IOrderService {

    /**
     * Tạo đơn hàng mới để đăng ký mua các gói học.
     *
     * @param userId ID người dùng đã xác thực
     * @param request gói mua trực tiếp và nhu cầu 1-1 nếu có
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    CheckoutPaymentResponse checkout(Long userId, CheckoutRequest request);

    /** Kiểm tra lịch 1-1 mong muốn với thời khóa biểu hiện tại trước khi người dùng xác nhận. */
    TutorScheduleCheckResponse validateTutorScheduleAvailability(Long userId, OneOnOneNeedsRequest needs);

    /**
     * Khởi tạo lại PayPal checkout cho đơn hàng PENDING.
     *
     * @param userId ID chủ sở hữu đơn hàng
     * @param orderId ID đơn hàng PENDING
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    CheckoutPaymentResponse createPaypalPayment(Long userId, Long orderId);

    /**
     * Capture PayPal order đã được người mua phê duyệt và cấp quyền sau khi xác minh.
     *
     * @param userId ID chủ sở hữu đơn hàng
     * @param orderId ID đơn hàng PENDING
     */
    OrderStatusResponse capturePaypalPayment(Long userId, Long orderId);

    /** Lấy trạng thái server-side của đơn hàng sau khi trình duyệt quay lại từ PayPal. */
    OrderStatusResponse getOrderStatus(Long userId, Long orderId);

    /**
     * Thực hiện hoàn tiền đơn hàng kèm theo lý do.
     *
     * @param orderId Tham số orderId
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    OrderResponse refundOrder(Long orderId, RefundRequest request);

    /** Kiểm tra điều kiện hoàn tiền trước khi tạo yêu cầu HR/Admin phê duyệt. */
    void validateRefundEligibility(Long orderId, String reason);

    /**
     * Lấy thông tin chi tiết đơn hàng.
     *
     * @param orderId Tham số orderId
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    OrderResponse getOrderById(Long orderId);

    /** Lấy chi tiết đơn hàng sau khi xác minh chủ sở hữu. */
    OrderResponse getOwnedOrderById(Long userId, Long orderId);

    /**
     * Lấy danh sách đơn hàng đã mua của người dùng.
     *
     * @param userId ID của người dùng (User)
     * @return danh sách các đối tượng phù hợp
     */
    List<OrderResponse> getOrdersByUserId(Long userId);

    /**
     * Lấy tất cả danh sách đơn hàng cho Admin Sales.
     */
    List<OrderResponse> getAllOrders();

    /**
     * Hủy đơn hàng thủ công kèm theo lý do.
     */
    OrderResponse cancelOrder(Long orderId, String reason);

    /**
     * Quét và tự động hủy các đơn hàng chưa thanh toán đã quá hạn.
     */
    void cancelExpiredOrders();
}
