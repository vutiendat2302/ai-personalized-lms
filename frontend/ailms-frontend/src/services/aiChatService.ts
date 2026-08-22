import type { AiChatRequestPayload, AiConversation } from "@/types/ai";
import { readSSE, type SSEReaderOptions } from "@/utils/sse";
import { getAccessToken, httpClient } from "@/api/httpClient";
import type { ApiResponse, PageResponse } from "@/types/base";

const CHAT_STREAM_ENDPOINT = "/api/v1/ai/chat/stream";
const PUBLIC_CHAT_STREAM_ENDPOINT = "/api/v1/public/ai/chat/stream";

export async function streamChat(
  payload: AiChatRequestPayload,
  options: Omit<SSEReaderOptions, "signal"> & {
    signal?: AbortSignal;
    onConversationId?: (conversationId: string) => void;
  }
): Promise<void> {
  const token = getAccessToken();
  const response = await fetch(CHAT_STREAM_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: "include",
    body: JSON.stringify(payload),
    signal: options.signal,
  });

  const conversationId = response.headers.get("X-Conversation-Id");
  if (conversationId) options.onConversationId?.(conversationId);

  return readSSE(response, options);
}

const FILE_CHAT_STREAM_ENDPOINT = "/api/v1/ai/chat/file/stream";

/** Stream Gemini phân tích tệp tài liệu (PDF, DOCX, TXT) hoặc ảnh đính kèm qua Backend gateway. */
export async function streamChatWithFile(
  payload: {
    question?: string;
    conversationId?: string;
    module?: string;
    route?: string;
    courseId?: string;
    lessonId?: string;
    retrievalScope?: AiChatRequestPayload["retrievalScope"];
    file: File;
  },
  options: Omit<SSEReaderOptions, "signal"> & {
    signal?: AbortSignal;
    onConversationId?: (conversationId: string) => void;
  }
): Promise<void> {
  const token = getAccessToken();
  const formData = new FormData();
  if (payload.question) formData.append("question", payload.question);
  if (payload.conversationId) formData.append("conversationId", payload.conversationId);
  if (payload.module) formData.append("module", payload.module);
  if (payload.route) formData.append("route", payload.route);
  if (payload.courseId) formData.append("courseId", payload.courseId);
  if (payload.lessonId) formData.append("lessonId", payload.lessonId);
  if (payload.retrievalScope) formData.append("retrievalScope", payload.retrievalScope);
  formData.append("file", payload.file);

  const response = await fetch(FILE_CHAT_STREAM_ENDPOINT, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: "include",
    body: formData,
    signal: options.signal,
  });

  const conversationId = response.headers.get("X-Conversation-Id");
  if (conversationId) options.onConversationId?.(conversationId);

  return readSSE(response, options);
}

/** Stream Gemini Vision phân tích ảnh và văn bản đính kèm qua Backend gateway. */
export async function streamChatWithImage(
  payload: {
    question?: string;
    conversationId?: string;
    module?: string;
    route?: string;
    courseId?: string;
    lessonId?: string;
    retrievalScope?: AiChatRequestPayload["retrievalScope"];
    image: File;
  },
  options: Omit<SSEReaderOptions, "signal"> & {
    signal?: AbortSignal;
    onConversationId?: (conversationId: string) => void;
  }
): Promise<void> {
  return streamChatWithFile(
    {
      question: payload.question,
      conversationId: payload.conversationId,
      module: payload.module,
      route: payload.route,
      courseId: payload.courseId,
      lessonId: payload.lessonId,
      retrievalScope: payload.retrievalScope,
      file: payload.image,
    },
    options
  );
}

/** Stream tư vấn catalog cho khách chưa đăng nhập qua Backend public gateway. */
export async function streamPublicCatalogChat(
  payload: { question: string; conversationId?: string },
  options: Omit<SSEReaderOptions, "signal"> & {
    signal?: AbortSignal;
    onConversationId?: (conversationId: string) => void;
  },
): Promise<void> {
  const response = await fetch(PUBLIC_CHAT_STREAM_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
    signal: options.signal,
  });
  const conversationId = response.headers.get("X-Conversation-Id");
  if (conversationId) options.onConversationId?.(conversationId);
  return readSSE(response, options);
}

/** Lấy danh sách hội thoại gần nhất của admin đăng nhập. */
export async function getConversations(): Promise<AiConversation[]> {
  const response = await httpClient.get<ApiResponse<PageResponse<AiConversation>>>(
    "/v1/ai/conversations",
    { params: { page: 0, size: 50 } }
  );
  return response.data.data.content;
}

/** Lấy toàn bộ tin nhắn của một hội thoại đã chọn. */
export async function getConversation(id: string): Promise<AiConversation> {
  const response = await httpClient.get<ApiResponse<AiConversation>>(
    `/v1/ai/conversations/${encodeURIComponent(id)}`
  );
  return response.data.data;
}

/** Xóa vĩnh viễn một hội thoại thuộc admin hiện tại. */
export async function deleteConversation(id: string): Promise<void> {
  await httpClient.delete(`/v1/ai/conversations/${encodeURIComponent(id)}`);
}

/** Đổi tiêu đề hội thoại thuộc admin hiện tại. */
export async function renameConversation(id: string, title: string): Promise<AiConversation> {
  const response = await httpClient.patch<ApiResponse<AiConversation>>(
    `/v1/ai/conversations/${encodeURIComponent(id)}/title`,
    { title }
  );
  return response.data.data;
}

/** Gửi thumbs up/down cho một câu trả lời AI. */
export async function submitMessageFeedback(
  messageId: string,
  feedback: "THUMBS_UP" | "THUMBS_DOWN"
): Promise<void> {
  await httpClient.put(`/v1/ai/messages/${encodeURIComponent(messageId)}/feedback`, {
    feedback,
  });
}
