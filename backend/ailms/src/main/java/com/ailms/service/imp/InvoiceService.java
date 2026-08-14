package com.ailms.service.imp;

import com.ailms.entity.OrderEntity;
import com.ailms.entity.OrderItemEntity;
import com.ailms.entity.enums.OrderStatusEnum;
import com.ailms.exception.BusinessException;
import com.ailms.exception.ForbiddenException;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.repository.OrderRepository;
import com.ailms.service.IInvoiceService;
import com.ailms.service.IFileStorageService;
import com.ailms.event.AuditLogEvent;
import com.openhtmltopdf.pdfboxout.PdfRendererBuilder;
import lombok.RequiredArgsConstructor;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.springframework.stereotype.Service;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

/** Tạo hóa đơn PDF Unicode trực tiếp từ snapshot order và order item. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class InvoiceService implements IInvoiceService {
    private static final DateTimeFormatter DATE_TIME = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private final OrderRepository orderRepository;
    private final IFileStorageService fileStorageService;
    private final ApplicationEventPublisher eventPublisher;

    /** Sinh hóa đơn thanh toán đúng một lần và lưu object key trên order. */
    @Override
    @Transactional
    public void storePaymentInvoice(Long orderId) {
        OrderEntity order = orderRepository.findById(orderId)
                .orElseThrow(() -> ResourceNotFoundException.of("Order", orderId));
        if (order.getStatus() != OrderStatusEnum.PAID && order.getStatus() != OrderStatusEnum.REFUNDED) {
            throw new BusinessException("Chỉ tạo hóa đơn thanh toán cho order đã thanh toán.");
        }
        if (order.getPaymentInvoiceKey() != null && fileStorageService.exists(order.getPaymentInvoiceKey())) return;
        String objectKey = invoiceKey(order, false);
        byte[] pdf = render(order, false);
        fileStorageService.upload(new ByteArrayInputStream(pdf), objectKey, "application/pdf", pdf.length);
        order.setPaymentInvoiceKey(objectKey);
        orderRepository.save(order);
        eventPublisher.publishEvent(new AuditLogEvent(
                this, "STORE_PAYMENT_INVOICE", "ORDER", orderId, null, objectKey));
    }

    /** Sinh chứng từ hoàn tiền đúng một lần và lưu object key trên order. */
    @Override
    @Transactional
    public void storeRefundInvoice(Long orderId) {
        OrderEntity order = orderRepository.findById(orderId)
                .orElseThrow(() -> ResourceNotFoundException.of("Order", orderId));
        if (order.getStatus() != OrderStatusEnum.REFUNDED) {
            throw new BusinessException("Chỉ tạo chứng từ hoàn tiền sau khi order REFUNDED.");
        }
        if (order.getRefundInvoiceKey() != null && fileStorageService.exists(order.getRefundInvoiceKey())) return;
        String objectKey = invoiceKey(order, true);
        byte[] pdf = render(order, true);
        fileStorageService.upload(new ByteArrayInputStream(pdf), objectKey, "application/pdf", pdf.length);
        order.setRefundInvoiceKey(objectKey);
        orderRepository.save(order);
        eventPublisher.publishEvent(new AuditLogEvent(
                this, "STORE_REFUND_INVOICE", "ORDER", orderId, null, objectKey));
    }

    /** Tải hóa đơn thanh toán đã lưu cho quản trị viên. */
    @Override
    public byte[] downloadPaymentForManagement(Long orderId) {
        return download(loadInvoiceOrder(orderId), false);
    }

    /** Tải hóa đơn thanh toán đã lưu cho đúng chủ đơn hàng để chống IDOR. */
    @Override
    public byte[] downloadPaymentForOwner(Long userId, Long orderId) {
        OrderEntity order = loadInvoiceOrder(orderId);
        validateOwner(order, userId);
        return download(order, false);
    }

    /** Tải chứng từ hoàn tiền đã lưu cho quản trị viên. */
    @Override
    public byte[] getRefundForManagement(Long orderId) {
        return download(loadRefundedOrder(orderId), true);
    }

    /** Tải chứng từ hoàn tiền đã lưu cho đúng chủ đơn hàng. */
    @Override
    public byte[] getRefundForOwner(Long userId, Long orderId) {
        OrderEntity order = loadRefundedOrder(orderId);
        validateOwner(order, userId);
        return download(order, true);
    }

    /** Chỉ cho sinh hóa đơn với đơn đã trả tiền hoặc đã hoàn tiền. */
    private OrderEntity loadInvoiceOrder(Long orderId) {
        OrderEntity order = orderRepository.findById(orderId)
                .orElseThrow(() -> ResourceNotFoundException.of("Order", orderId));
        if (order.getStatus() != OrderStatusEnum.PAID && order.getStatus() != OrderStatusEnum.REFUNDED) {
            throw new BusinessException("Chỉ đơn hàng đã thanh toán mới có hóa đơn.");
        }
        return order;
    }

    /** Chỉ cho tải chứng từ hoàn tiền của order đã REFUNDED. */
    private OrderEntity loadRefundedOrder(Long orderId) {
        OrderEntity order = orderRepository.findById(orderId)
                .orElseThrow(() -> ResourceNotFoundException.of("Order", orderId));
        if (order.getStatus() != OrderStatusEnum.REFUNDED) {
            throw new BusinessException("Đơn hàng chưa được hoàn tiền.");
        }
        return order;
    }

    /** Chặn tải hóa đơn/chứng từ của người dùng khác. */
    private void validateOwner(OrderEntity order, Long userId) {
        if (order.getUserEntity() == null || !order.getUserEntity().getId().equals(userId)) {
            throw new ForbiddenException("Bạn không có quyền tải chứng từ này.");
        }
    }

    /** Đọc đúng object PDF đã lưu trên MinIO, không render lại trong endpoint GET. */
    private byte[] download(OrderEntity order, boolean refund) {
        String objectKey = refund ? order.getRefundInvoiceKey() : order.getPaymentInvoiceKey();
        if (objectKey == null || objectKey.isBlank()) {
            throw new ResourceNotFoundException(refund
                    ? "Chứng từ hoàn tiền chưa được tạo." : "Hóa đơn thanh toán chưa được tạo.");
        }
        try (InputStream input = fileStorageService.download(objectKey)) {
            return input.readAllBytes();
        } catch (Exception exception) {
            throw new BusinessException("Không thể tải chứng từ PDF: " + exception.getMessage());
        }
    }

    /** Tạo object key ổn định để thao tác sinh hóa đơn có tính idempotent. */
    private String invoiceKey(OrderEntity order, boolean refund) {
        return "invoices/" + order.getUserEntity().getId() + "/" + order.getId()
                + (refund ? "/refund.pdf" : "/payment.pdf");
    }

    /** Render HTML hóa đơn thành PDF bằng bộ font Unicode có sẵn của dự án. */
    private byte[] render(OrderEntity order, boolean refund) {
        try {
            Document document = Jsoup.parse(buildHtml(order, refund));
            document.outputSettings().syntax(Document.OutputSettings.Syntax.xml);
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            PdfRendererBuilder builder = new PdfRendererBuilder();
            builder.useFastMode();
            byte[] regular = readResource("/fonts/NotoSans-Regular.ttf");
            byte[] bold = readResource("/fonts/NotoSans-Bold.ttf");
            builder.useFont(() -> new ByteArrayInputStream(regular), "Noto Sans", 400,
                    PdfRendererBuilder.FontStyle.NORMAL, true);
            builder.useFont(() -> new ByteArrayInputStream(bold), "Noto Sans", 700,
                    PdfRendererBuilder.FontStyle.NORMAL, true);
            builder.withHtmlContent(document.html(), null);
            builder.toStream(output);
            builder.run();
            return output.toByteArray();
        } catch (Exception exception) {
            throw new BusinessException("Không thể tạo hóa đơn PDF: " + exception.getMessage());
        }
    }

    /** Đọc font đóng gói trong classpath và báo lỗi rõ ràng nếu thiếu. */
    private byte[] readResource(String path) throws Exception {
        try (InputStream input = getClass().getResourceAsStream(path)) {
            if (input == null) throw new IllegalStateException("Thiếu tài nguyên " + path);
            return input.readAllBytes();
        }
    }

    /** Tạo XHTML hóa đơn từ dữ liệu snapshot, không lấy lại giá hiện tại của gói. */
    private String buildHtml(OrderEntity order, boolean refund) {
        StringBuilder rows = new StringBuilder();
        int index = 1;
        for (OrderItemEntity item : order.getItems()) {
            rows.append("<tr><td>").append(index++).append("</td><td>")
                    .append(escape(item.getCoursePackageEntity().getCourseEntity().getName())).append("<br/><small>")
                    .append(escape(item.getCoursePackageEntity().getName())).append("</small></td><td>")
                    .append(money(item.getPriceSnapshot())).append("</td><td>")
                    .append(money(item.getDiscountSnapshot())).append("</td><td>")
                    .append(money(item.getFinalPrice())).append("</td></tr>");
        }
        String paidAt = order.getPaidAt() != null ? DATE_TIME.format(order.getPaidAt()) : "—";
        String documentTitle = refund ? "CHỨNG TỪ HOÀN TIỀN AILMS" : "HÓA ĐƠN THANH TOÁN AILMS";
        String documentCode = (refund ? "REF-" : "INV-") + order.getId();
        String amountLabel = refund ? "Đã hoàn tiền" : "Đã thanh toán";
        return """
                <!DOCTYPE html><html><head><meta charset='UTF-8'/><style>
                @page { size: A4; margin: 24mm 18mm; }
                body { font-family: 'Noto Sans'; color: #172033; font-size: 12px; }
                h1 { color: #3730a3; margin-bottom: 4px; } .muted { color: #64748b; }
                .meta { margin: 24px 0; line-height: 1.8; }
                table { width: 100%%; border-collapse: collapse; } th { background: #eef2ff; }
                th, td { border: 1px solid #dbe2ea; padding: 9px; text-align: left; }
                th:nth-child(n+3), td:nth-child(n+3) { text-align: right; }
                .totals { margin: 18px 0 0 auto; width: 46%%; } .total { font-size: 15px; font-weight: 700; color: #3730a3; }
                .footer { margin-top: 40px; border-top: 1px solid #dbe2ea; padding-top: 12px; }
                </style></head><body>
                <h1>%s</h1><div class='muted'>Mã chứng từ: %s</div>
                <div class='meta'><b>Khách hàng:</b> %s<br/><b>Email:</b> %s<br/><b>Ngày thanh toán:</b> %s<br/><b>Trạng thái:</b> %s</div>
                <table><thead><tr><th>#</th><th>Khóa học / Gói học</th><th>Giá gốc</th><th>Giảm giá</th><th>Thành tiền</th></tr></thead><tbody>%s</tbody></table>
                <table class='totals'><tr><td>Tạm tính</td><td>%s</td></tr><tr><td>Voucher %s</td><td>-%s</td></tr><tr class='total'><td>%s</td><td>%s</td></tr></table>
                <div class='footer muted'>Hóa đơn điện tử được sinh từ dữ liệu giao dịch của hệ thống AILMS.</div>
                </body></html>
                """.formatted(documentTitle, documentCode, escape(order.getUserEntity().getFullName()),
                escape(order.getUserEntity().getEmail()), paidAt, order.getStatus(), rows,
                money(order.getTotalAmount()), escape(order.getCouponCode() != null ? order.getCouponCode() : "—"),
                money(order.getDiscountAmount()), amountLabel, money(order.getFinalAmount()));
    }

    /** Định dạng số tiền theo tiền tệ VNĐ trong hóa đơn. */
    private String money(BigDecimal amount) {
        NumberFormat format = NumberFormat.getNumberInstance(Locale.forLanguageTag("vi-VN"));
        format.setMaximumFractionDigits(0);
        return format.format(amount != null ? amount : BigDecimal.ZERO) + " VNĐ";
    }

    /** Escape ký tự HTML cho dữ liệu người dùng và tên sản phẩm. */
    private String escape(String value) {
        if (value == null) return "—";
        return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                .replace("\"", "&quot;").replace("'", "&#39;");
    }
}
