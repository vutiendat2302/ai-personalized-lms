package com.ailms.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

/** Nạp cấu hình PayPal Sandbox/Live hoàn toàn từ biến môi trường. */
@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "paypal")
public class PaypalProperties {
    private String clientId;
    private String clientSecret;
    private String apiBaseUrl;
    private String returnUrl;
    private String cancelUrl;
    private String currency = "USD";
    private BigDecimal vndPerUnit = new BigDecimal("26000");
}
