package com.ailms.config;

import com.ailms.client.AiServiceClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.ClientHttpRequestFactory;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.support.RestClientAdapter;
import org.springframework.web.service.invoker.HttpServiceProxyFactory;

import java.time.Duration;

/**
 * Cấu hình RestClient và HTTP Service Proxy Client kết nối với ai-service.
 */
@Configuration
public class AiServiceConfig {

    @Value("${ai-service.base-url:http://localhost:8000}")
    private String baseUrl;

    @Value("${ai-service.internal-token:${ai-service.interal-token:dev_internal_secret_123}}")
    private String internalToken;

    /**
     * Tạo Bean AiServiceClient proxy tự động với header xác thực X-Internal-Token.
     */
    @Bean
    public AiServiceClient aiServiceClient() {
        RestClient restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .defaultHeader("X-Internal-Token", internalToken)
                .requestFactory(clientHttpRequestFactory())
                .build();

        RestClientAdapter adapter = RestClientAdapter.create(restClient);
        HttpServiceProxyFactory factory = HttpServiceProxyFactory.builderFor(adapter).build();

        return factory.createClient(AiServiceClient.class);
    }

    /**
     * Cấu hình thời gian timeout kết nối (5s) và đọc dữ liệu (30s) cho HTTP request sang AI service.
     */
    private ClientHttpRequestFactory clientHttpRequestFactory() {
        var factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout((int) Duration.ofSeconds(5).toMillis());
        factory.setReadTimeout((int) Duration.ofSeconds(30).toMillis()); // Gemini processing timeout
        return factory;
    }
}
