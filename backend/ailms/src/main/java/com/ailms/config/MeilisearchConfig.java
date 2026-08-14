package com.ailms.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.ClientHttpRequestFactory;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import java.net.http.HttpClient;
import java.time.Duration;

/** Cấu hình HTTP client dùng để giao tiếp với Meilisearch. */
@Configuration
public class MeilisearchConfig {

    /** Tạo RestClient với URL và API key được đọc từ biến môi trường. */
    @Bean
    public RestClient meilisearchRestClient(
            @Value("${meilisearch.url:http://localhost:7700}") String url,
            @Value("${meilisearch.api-key:}") String apiKey) {
        RestClient.Builder builder = RestClient.builder()
                .baseUrl(url)
                .requestFactory(requestFactory());
        if (!apiKey.isBlank()) {
            builder.defaultHeader("Authorization", "Bearer " + apiKey);
        }
        return builder.build();
    }

    /** Dùng JDK HTTP client để hỗ trợ PATCH khi cấu hình settings của Meilisearch. */
    private ClientHttpRequestFactory requestFactory() {
        HttpClient httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(2))
                .build();
        return new JdkClientHttpRequestFactory(httpClient);
    }
}
