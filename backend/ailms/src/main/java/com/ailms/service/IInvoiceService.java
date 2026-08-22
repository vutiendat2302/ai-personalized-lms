package com.ailms.service;

/** Sinh hóa đơn PDF từ snapshot của đơn hàng đã thanh toán. */
public interface IInvoiceService {
    /** Tự động sinh và lưu hóa đơn thanh toán lên MinIO sau capture. */
    void storePaymentInvoice(Long orderId);

    /** Tự động sinh và lưu chứng từ hoàn tiền lên MinIO sau refund. */
    void storeRefundInvoice(Long orderId);

    /** Tải hóa đơn thanh toán đã lưu cho quản trị viên theo order ID. */
    byte[] downloadPaymentForManagement(Long orderId);

    /** Tải hóa đơn thanh toán đã lưu cho chủ đơn hàng và chặn IDOR. */
    byte[] downloadPaymentForOwner(Long userId, Long orderId);

    /** Tải chứng từ hoàn tiền đã lưu cho quản trị viên. */
    byte[] getRefundForManagement(Long orderId);

    /** Tải chứng từ hoàn tiền đã lưu cho đúng chủ đơn hàng. */
    byte[] getRefundForOwner(Long userId, Long orderId);
}
