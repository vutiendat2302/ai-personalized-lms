package com.ailms.service.imp;

import com.ailms.request.ai.AiHistoryMessageRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import tools.jackson.databind.ObjectMapper;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

/** Redis buffer giữ tối đa mười message gần nhất cho prompt chat. */
@Service
@RequiredArgsConstructor
@Slf4j
public class AiConversationBufferService {

    private static final int MAX_MESSAGES = 10;
    private static final Duration TTL = Duration.ofMinutes(30);
    private final RedisTemplate<String, String> redisTemplate;
    private final ObjectMapper objectMapper;

    /** Đọc lịch sử gần nhất; lỗi Redis được coi như cache miss. */
    public List<AiHistoryMessageRequest> get(Long ownerId, String conversationId) {
        try {
            List<String> values = redisTemplate.opsForList()
                    .range(key(ownerId, conversationId), 0, MAX_MESSAGES - 1);
            if (values == null || values.isEmpty()) {
                return List.of();
            }
            List<AiHistoryMessageRequest> result = new ArrayList<>();
            for (String value : values) {
                result.add(objectMapper.readValue(value, AiHistoryMessageRequest.class));
            }
            return result;
        } catch (Exception exception) {
            log.warn("Không thể đọc Redis chat buffer, chuyển sang MySQL");
            return List.of();
        }
    }

    /** Thêm message, trim còn mười phần tử và gia hạn TTL. */
    public void append(
            Long ownerId, String conversationId, AiHistoryMessageRequest message) {
        String key = key(ownerId, conversationId);
        try {
            redisTemplate.opsForList().rightPush(key, objectMapper.writeValueAsString(message));
            redisTemplate.opsForList().trim(key, -MAX_MESSAGES, -1);
            redisTemplate.expire(key, TTL);
        } catch (Exception exception) {
            log.warn("Không thể cập nhật Redis chat buffer");
        }
    }

    /** Warm cache bằng lịch sử lấy từ MySQL. */
    public void replace(
            Long ownerId, String conversationId, List<AiHistoryMessageRequest> messages) {
        clear(ownerId, conversationId);
        messages.stream().skip(Math.max(0, messages.size() - MAX_MESSAGES))
                .forEach(message -> append(ownerId, conversationId, message));
    }

    /** Xóa buffer khi user xóa session. */
    public void clear(Long ownerId, String conversationId) {
        try {
            redisTemplate.delete(key(ownerId, conversationId));
        } catch (Exception exception) {
            log.warn("Không thể xóa Redis chat buffer");
        }
    }

    /** Tạo Redis key tách biệt theo owner và conversation. */
    private String key(Long ownerId, String conversationId) {
        return "ai:chat:buffer:" + ownerId + ":" + conversationId;
    }
}
