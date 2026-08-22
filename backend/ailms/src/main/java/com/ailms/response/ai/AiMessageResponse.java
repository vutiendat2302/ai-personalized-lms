package com.ailms.response.ai;

import com.ailms.entity.enums.AiFeedbackType;
import lombok.*;

import java.time.LocalDateTime;

/** Tin nhắn trả về cho màn hình lịch sử chat. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiMessageResponse {
    private String id;
    private String role;
    private String content;
    private LocalDateTime createdAt;
    private AiFeedbackType feedback;
}
