package com.ailms.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
// Serializer dùng để chuyển String <-> byte[]
// Redis chỉ lưu byte[] nên mọi dữ liệu đều phải serialize
import org.springframework.data.redis.serializer.StringRedisSerializer;

@Configuration
public class RedisConfig {

    /**
     * Tạo Bean RedisTemplate<String, String>
     * Key: String
     * Value: String
     * Sau khi khai báo Bean này, có thể inject ở bất kỳ đâu:
     * private RedisTemplate<String, String> redisTemplate;
     */
    @Bean
    public RedisTemplate<String, String> redisTemplate(RedisConnectionFactory connectionFactory) {
        // Tạo RedisTemplate mới
        RedisTemplate<String, String> template = new RedisTemplate<>();
        // Đây là object quản lý kết nối tới Redis Server
        template.setConnectionFactory(connectionFactory);
        // Thiết lập cách serialize Key, value
        template.setKeySerializer(new StringRedisSerializer());
        template.setValueSerializer(new StringRedisSerializer());
        return template;
    }
}
