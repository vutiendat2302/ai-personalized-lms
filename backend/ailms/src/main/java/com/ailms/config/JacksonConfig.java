package com.ailms.config;


import com.ailms.common.converter.LongToStringSerializer;
import tools.jackson.databind.module.SimpleModule;
import org.springframework.boot.jackson.autoconfigure.JsonMapperBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
/**
 * Cấu hình Jackson để serialize kiểu Long / long thành String trong JSON response.
 *
 * <p>Lý do: Snowflake ID (64-bit Long) vượt quá giới hạn an toàn của số nguyên
 * trong JavaScript (Number.MAX_SAFE_INTEGER = 2^53 − 1).
 * Khi JSON.parse() nhận số nguyên lớn, JS tự làm tròn → ID sai → CRUD thất bại.
 *
 * <p>Giải pháp: Gửi tất cả Long dưới dạng String ("333793801690681340")
 * thay vì number (333793801690681340). Frontend đã được cập nhật để dùng kiểu string.
 */

@Configuration(proxyBeanMethods = false)
public class JacksonConfig {

    @Bean
    public JsonMapperBuilderCustomizer longToStringCustomizer() {
        SimpleModule module = new SimpleModule();
        module.addSerializer(Long.class, new LongToStringSerializer());

        return builder -> builder.addModule(module);
    }
}