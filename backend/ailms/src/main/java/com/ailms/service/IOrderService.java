package com.ailms.service;

import com.ailms.request.CheckoutRequest;
import com.ailms.request.RefundRequest;
import com.ailms.response.OrderResponse;
import com.ailms.response.PaymentTransactionResponse;

import java.util.List;

/**
 * Service quản lý đơn hàng, xử lý thanh toán, hoàn tiền và đối soát giao dịch.
 */
public interface IOrderService {

    /**
     * Tạo đơn hàng mới để đăng ký mua các gói học.
     *
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    OrderResponse createOrder(CheckoutRequest request);

    /**
     * Khởi tạo giao dịch thanh toán trực tuyến cho đơn hàng.
     *
     * @param orderId Tham số orderId
     * @param paymentMethod Tham số paymentMethod
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    PaymentTransactionResponse initiatePayment(Long orderId, String paymentMethod);

    /**
     * Xử lý kết quả phản hồi giao dịch từ cổng thanh toán.
     *
     * @param transactionRef Mã tham chiếu giao dịch thanh toán
     * @param success Trạng thái thanh toán (true nếu thành công)
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    OrderResponse handlePaymentCallback(String transactionRef, boolean success);

    /**
     * Thực hiện hoàn tiền đơn hàng kèm theo lý do.
     *
     * @param orderId Tham số orderId
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    OrderResponse refundOrder(Long orderId, RefundRequest request);

    /**
     * Lấy thông tin chi tiết đơn hàng.
     *
     * @param orderId Tham số orderId
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    OrderResponse getOrderById(Long orderId);

    /**
     * Lấy danh sách đơn hàng đã mua của người dùng.
     *
     * @param userId ID của người dùng (User)
     * @return danh sách các đối tượng phù hợp
     */
    List<OrderResponse> getOrdersByUserId(Long userId);

    /**
     * Quét và tự động hủy các đơn hàng chưa thanh toán đã quá hạn.
     */
    void cancelExpiredOrders();
}
