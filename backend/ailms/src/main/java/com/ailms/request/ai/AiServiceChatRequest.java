package com.ailms.request.ai;

import lombok.*;

import java.util.List;

/** Request nội bộ đã bổ sung owner, role và lịch sử đáng tin cậy. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiServiceChatRequest {
    private String question;
    private String conversationId;
    private String systemInstruction;
    private String ownerId;
    private List<String> roles;
    private String scope;
    private String module;
    private String route;
    private List<AiHistoryMessageRequest> history;
    private String toolAccessToken;
    private String imageBase64;
    private String imageMimeType;
    private String fileBase64;
    private String fileMimeType;
    private String fileName;
    private String retrievalMode;
    private String courseId;
    private String classId;
    private String lessonId;
    private String retrievalScope;
}
