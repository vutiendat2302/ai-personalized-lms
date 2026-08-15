package com.ailms.client;

import com.ailms.config.PaypalProperties;
import com.ailms.exception.BusinessException;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Client dùng chung để tạo và capture PayPal Orders ở phía backend. */
@Component
@RequiredArgsConstructor
public class PaypalClient {

    private final PaypalProperties properties;
    private final RestClient.Builder restClientBuilder;
    private volatile String cachedAccessToken;
    private volatile Instant cachedAccessTokenExpiresAt = Instant.EPOCH;

    /** Tạo PayPal order và trả approval URL cùng số tiền gateway đã quy đổi. */
    public CreateOrderResult createOrder(
            String requestId, String referenceId, Long applicationOrderId, BigDecimal vndAmount, String description) {
        validateConfiguration();
        BigDecimal gatewayAmount = toGatewayAmount(vndAmount);
        String accessToken = getAccessToken();
        Map<String, Object> payload = Map.of(
                "intent", "CAPTURE",
                "purchase_units", List.of(Map.of(
                        "reference_id", referenceId,
                        "description", description,
                        "amount", Map.of(
                                "currency_code", properties.getCurrency().toUpperCase(),
                                "value", gatewayAmount.toPlainString()))),
                "payment_source", Map.of("paypal", Map.of("experience_context", Map.of(
                        "return_url", appendApplicationOrderId(properties.getReturnUrl(), applicationOrderId),
                        "cancel_url", appendApplicationOrderId(properties.getCancelUrl(), applicationOrderId),
                        "user_action", "PAY_NOW"))));
        PaypalOrderResponse response;
        try {
            response = restClientBuilder.build().post()
                    .uri(properties.getApiBaseUrl() + "/v2/checkout/orders")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                    .header("PayPal-Request-Id", requestId)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .body(PaypalOrderResponse.class);
        } catch (RestClientResponseException exception) {
            throw new BusinessException("PayPal từ chối tạo giao dịch. Vui lòng kiểm tra lại giá trị đơn hàng.");
        }
        if (response == null || isBlank(response.getId())) {
            throw new BusinessException("Không nhận được PayPal order từ Sandbox.");
        }
        String approvalUrl = response.findApprovalUrl();
        if (isBlank(approvalUrl)) {
            throw new BusinessException("PayPal Sandbox không trả URL phê duyệt thanh toán.");
        }
        return new CreateOrderResult(response.getId(), approvalUrl, gatewayAmount, properties.getCurrency().toUpperCase());
    }

    /** Capture order đã được người mua phê duyệt và trả trạng thái PayPal đã xác minh. */
    public CaptureOrderResult captureOrder(String paypalOrderId, String requestId) {
        validateConfiguration();
        PaypalOrderResponse response;
        try {
            response = restClientBuilder.build().post()
                    .uri(properties.getApiBaseUrl() + "/v2/checkout/orders/{id}/capture", paypalOrderId)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + getAccessToken())
                    .header("PayPal-Request-Id", requestId)
                    .header("Prefer", "return=representation")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of())
                    .retrieve()
                    .body(PaypalOrderResponse.class);
        } catch (RestClientResponseException exception) {
            throw new BusinessException("Thanh toán PayPal chưa được phê duyệt hoặc chưa hoàn tất.");
        }
        if (response == null || !paypalOrderId.equals(response.getId())) {
            throw new BusinessException("Kết quả capture PayPal không khớp giao dịch đang chờ.");
        }
        PaypalOrderResponse.Capture capture = response.findCapture();
        if (!"COMPLETED".equals(response.getStatus()) || capture == null || isBlank(capture.getId())
                || capture.getAmount() == null || isBlank(capture.getAmount().getCurrencyCode())
                || isBlank(capture.getAmount().getValue())) {
            throw new BusinessException("Thanh toán PayPal chưa hoàn tất.");
        }
        try {
            return new CaptureOrderResult(capture.getId(), new BigDecimal(capture.getAmount().getValue()),
                    capture.getAmount().getCurrencyCode().toUpperCase());
        } catch (NumberFormatException ex) {
            throw new BusinessException("Số tiền PayPal trả về không hợp lệ.");
        }
    }

    /** Hoàn toàn bộ capture PayPal theo request ID idempotent và trả kết quả đã đối soát. */
    public RefundCaptureResult refundCapture(
            String captureId, String requestId, BigDecimal amount, String currency, String reason) {
        validateConfiguration();
        if (isBlank(captureId) || isBlank(requestId) || amount == null || amount.signum() <= 0 || isBlank(currency)) {
            throw new BusinessException("Thông tin giao dịch PayPal cần hoàn không hợp lệ.");
        }
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("amount", Map.of(
                "currency_code", currency.toUpperCase(),
                "value", amount.toPlainString()));
        if (!isBlank(reason)) payload.put("note_to_payer", truncate(reason.trim(), 255));

        PaypalRefundResponse response;
        try {
            response = restClientBuilder.build().post()
                    .uri(properties.getApiBaseUrl() + "/v2/payments/captures/{id}/refund", captureId)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + getAccessToken())
                    .header("PayPal-Request-Id", requestId)
                    .header("Prefer", "return=representation")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .body(PaypalRefundResponse.class);
        } catch (RestClientResponseException exception) {
            throw new BusinessException("PayPal từ chối hoàn tiền cho giao dịch này.");
        }
        return toCompletedRefundResult(response);
    }

    /** Xác thực và chuyển PayPal Refund response COMPLETED sang kết quả nội bộ. */
    RefundCaptureResult toCompletedRefundResult(PaypalRefundResponse response) {
        if (response == null || isBlank(response.getId()) || !"COMPLETED".equals(response.getStatus())
                || response.getAmount() == null || isBlank(response.getAmount().getCurrencyCode())
                || isBlank(response.getAmount().getValue())) {
            throw new BusinessException("PayPal chưa xác nhận hoàn tiền hoàn tất. Vui lòng thử lại sau.");
        }
        try {
            return new RefundCaptureResult(response.getId(), new BigDecimal(response.getAmount().getValue()),
                    response.getAmount().getCurrencyCode().toUpperCase());
        } catch (NumberFormatException exception) {
            throw new BusinessException("Số tiền hoàn PayPal trả về không hợp lệ.");
        }
    }

    /** Tái sử dụng OAuth token còn hạn để mỗi thao tác thanh toán không phải gọi thêm một request xác thực. */
    private String getAccessToken() {
        Instant now = Instant.now();
        if (!isBlank(cachedAccessToken) && now.isBefore(cachedAccessTokenExpiresAt)) {
            return cachedAccessToken;
        }
        return refreshAccessToken(now);
    }

    /** Làm mới token đồng bộ một lần và chừa biên an toàn 60 giây trước thời điểm hết hạn. */
    private synchronized String refreshAccessToken(Instant requestedAt) {
        if (!isBlank(cachedAccessToken) && requestedAt.isBefore(cachedAccessTokenExpiresAt)) {
            return cachedAccessToken;
        }
        String basic = Base64.getEncoder().encodeToString((properties.getClientId() + ":" + properties.getClientSecret())
                .getBytes(StandardCharsets.UTF_8));
        PaypalAccessTokenResponse response = restClientBuilder.build().post()
                .uri(properties.getApiBaseUrl() + "/v1/oauth2/token")
                .header(HttpHeaders.AUTHORIZATION, "Basic " + basic)
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body("grant_type=client_credentials")
                .retrieve()
                .body(PaypalAccessTokenResponse.class);
        if (response == null || isBlank(response.getAccessToken())) {
            throw new BusinessException("Không thể xác thực PayPal Sandbox.");
        }
        long expiresIn = response.getExpiresIn() == null ? 300L : Math.max(1L, response.getExpiresIn());
        cachedAccessToken = response.getAccessToken();
        cachedAccessTokenExpiresAt = requestedAt.plusSeconds(Math.max(1L, expiresIn - 60L));
        return cachedAccessToken;
    }

    /** Quy đổi giá VND thành currency PayPal theo tỷ giá Sandbox cấu hình rõ ràng. */
    BigDecimal toGatewayAmount(BigDecimal vndAmount) {
        if (vndAmount == null || vndAmount.signum() <= 0) {
            throw new BusinessException("Số tiền thanh toán không hợp lệ.");
        }
        if ("USD".equalsIgnoreCase(properties.getCurrency())) {
            BigDecimal gatewayAmount = vndAmount.divide(properties.getVndPerUnit(), 2, RoundingMode.HALF_UP);
            if (gatewayAmount.compareTo(new BigDecimal("0.01")) < 0) {
                BigDecimal minimumVnd = properties.getVndPerUnit().movePointLeft(2).setScale(0, RoundingMode.CEILING);
                throw new BusinessException(
                        "Giá trị đơn hàng quá thấp để thanh toán PayPal. Tối thiểu "
                                + minimumVnd.toPlainString() + " VND.");
            }
            return gatewayAmount;
        }
        throw new BusinessException("PAYPAL_CURRENCY hiện chỉ hỗ trợ USD cho giá khóa học VND.");
    }

    /** Kiểm tra cấu hình PayPal trước khi gọi network. */
    private void validateConfiguration() {
        if (isBlank(properties.getClientId()) || isBlank(properties.getClientSecret())
                || isBlank(properties.getApiBaseUrl()) || isBlank(properties.getReturnUrl())
                || isBlank(properties.getCancelUrl()) || properties.getVndPerUnit() == null
                || properties.getVndPerUnit().signum() <= 0) {
            throw new BusinessException("Chưa cấu hình đầy đủ biến môi trường PayPal Sandbox.");
        }
    }

    /** Kiểm tra chuỗi cấu hình rỗng. */
    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    /** Cắt ghi chú theo giới hạn PayPal mà không thay đổi nội dung nghiệp vụ lưu trong database. */
    private String truncate(String value, int maxLength) {
        return value.length() <= maxLength ? value : value.substring(0, maxLength);
    }

    /** Gắn mã đơn AILMS vào redirect để frontend khôi phục ngữ cảnh, không dùng nó để cấp quyền. */
    private String appendApplicationOrderId(String redirectUrl, Long applicationOrderId) {
        String separator = redirectUrl.contains("?") ? "&" : "?";
        return redirectUrl + separator + "orderId=" + applicationOrderId;
    }

    /** Kết quả tạo order cần cho frontend redirect và đối soát transaction. */
    public record CreateOrderResult(String orderId, String approvalUrl, BigDecimal amount, String currency) {}

    /** Kết quả capture có capture ID và số tiền PayPal xác minh. */
    public record CaptureOrderResult(String captureId, BigDecimal amount, String currency) {}

    /** Kết quả refund đã hoàn tất gồm ID, số tiền và currency do PayPal xác nhận. */
    public record RefundCaptureResult(String refundId, BigDecimal amount, String currency) {}

    /** DTO nội bộ nhận OAuth response từ PayPal. */
    @Getter
    @Setter
    public static class PaypalAccessTokenResponse {
        @JsonProperty("access_token")
        private String accessToken;

        @JsonProperty("expires_in")
        private Long expiresIn;
    }

    /** DTO nội bộ tối thiểu cho PayPal Refund response. */
    @Getter
    @Setter
    public static class PaypalRefundResponse {
        private String id;
        private String status;
        private Amount amount;

        @Getter
        @Setter
        public static class Amount {
            @JsonProperty("currency_code")
            private String currencyCode;
            private String value;
        }
    }

    /** DTO nội bộ tối thiểu cho create/capture PayPal Orders API. */
    @Getter
    @Setter
    public static class PaypalOrderResponse {
        private String id;
        private String status;
        private List<Link> links;
        @JsonProperty("purchase_units")
        private List<PurchaseUnit> purchaseUnits;

        /** Tìm approval URL từ HATEOAS links mà PayPal trả về. */
        public String findApprovalUrl() {
            if (links == null) return null;
            return links.stream()
                    .filter(link -> "approve".equalsIgnoreCase(link.getRel())
                            || "payer-action".equalsIgnoreCase(link.getRel()))
                    .map(Link::getHref)
                    .filter(value -> value != null && !value.isBlank())
                    .findFirst()
                    .orElse(null);
        }

        /** Lấy capture đầu tiên của purchase unit duy nhất trong checkout này. */
        public Capture findCapture() {
            if (purchaseUnits == null || purchaseUnits.isEmpty()) return null;
            Payments payments = purchaseUnits.getFirst().getPayments();
            return payments == null || payments.getCaptures() == null || payments.getCaptures().isEmpty()
                    ? null : payments.getCaptures().getFirst();
        }

        @Getter @Setter public static class Link { private String href; private String rel; }
        @Getter @Setter public static class PurchaseUnit { private Payments payments; }
        @Getter @Setter public static class Payments { private List<Capture> captures; }
        @Getter @Setter public static class Capture { private String id; private Amount amount; }
        @Getter @Setter public static class Amount {
            @JsonProperty("currency_code")
            private String currencyCode;
            private String value;
        }
    }
}
