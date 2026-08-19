import httpClient from "@/api/httpClient";
import type { ApiResponse, PageResponse } from "@/types/base";
import type { PublicCourseCard, PublicPage } from "@/api/public/publicCatalogApi";

export interface SupportOption { id: string; label: string; actionType: string }
export interface VisitorSession { visitorId: string; visitorToken: string; conversationId: string }
export interface SupportConversation {
  id: string;
  status: string;
  queuePosition: number | null;
  estimatedWaitMinutes: number | null;
  hasContact: boolean;
  fullName: string | null;
  email: string | null;
  createdAt: string;
  createdAtEpochMs: string;
  startedAt: string | null;
  endedAt: string | null;
  requestCloseAvailableAtEpochMs: string | null;
  autoCloseAtEpochMs: string | null;
  assignedSupportName: string | null;
  assignedSupportAvatarUrl: string | null;
}
export interface SupportMessage {
  id: number | string;
  senderType: "VISITOR" | "BOT" | "HR" | "SYSTEM";
  messageType: "TEXT" | "QUICK_REPLIES" | "COURSE_RESULTS" | "RESOURCE_CARD" | "ATTACHMENT" | "SYSTEM";
  content: string;
  metadata: string | null;
  createdAt: string;
}

export interface SupportResource {
  type: "COURSE" | "CATEGORY" | "PACKAGE" | "POLICY" | "TEACHER";
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string | null;
  href: string;
}

/** Gọi Backend để Backend dùng semantic catalog của AI chọn khóa học thật. */
export async function getGuidedRecommendations(payload: {
  categoryId: string; level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED"; goal: string;
}): Promise<PublicCourseCard[]> {
  const response = await httpClient.post<ApiResponse<PublicPage<PublicCourseCard>>>(
    "/v1/public/support/recommendations", { ...payload, limit: 6 },
  );
  return response.data.data.content;
}

const TOKEN_KEY = "ailms.support.visitorToken";

/** Lấy visitor token đã lưu, không lưu nội dung conversation trong localStorage. */
export const getVisitorToken = (): string | null => localStorage.getItem(TOKEN_KEY);

/** Xóa visitor token hỏng để lần mở chat sau tạo session mới. */
export const clearVisitorToken = (): void => localStorage.removeItem(TOKEN_KEY);

/** Trích xuất mã HTTP status từ response hoặc payload lỗi của API. */
const extractErrorStatus = (error: unknown): number | undefined => {
  if (typeof error !== "object" || error === null) return undefined;
  if ("status" in error && typeof (error as { status?: unknown }).status === "number") {
    return (error as { status: number }).status;
  }
  if ("response" in error) {
    const response = (error as { response?: { status?: number } }).response;
    return response?.status;
  }
  return undefined;
};

/** Khởi tạo visitor session khi browser chưa có token. */
export async function ensureVisitor(): Promise<VisitorSession> {
  const existing = getVisitorToken();
  if (existing) {
    try {
      const current = await getCurrentConversation(existing);
      return { visitorId: "", visitorToken: existing, conversationId: current.id };
    } catch (error: unknown) {
      const status = extractErrorStatus(error);
      if (status !== 400 && status !== 404) throw error;
      clearVisitorToken();
    }
  }
  const response = await httpClient.post<ApiResponse<VisitorSession>>("/v1/public/support/visitors");
  const session = response.data.data;
  localStorage.setItem(TOKEN_KEY, session.visitorToken);
  return session;
}

/** Gọi API với visitor token trong header bảo vệ conversation. */
const config = (token: string) => ({ headers: { "X-Visitor-Token": token } });

/** Lấy các quick reply do backend kiểm soát. */
export async function getSupportOptions(): Promise<SupportOption[]> {
  const response = await httpClient.get<ApiResponse<SupportOption[]>>("/v1/public/support/options");
  return response.data.data;
}

/** Khôi phục hoặc tạo conversation hiện tại sau khi mở/reload widget. */
export async function getCurrentConversation(token: string): Promise<SupportConversation> {
  const response = await httpClient.get<ApiResponse<SupportConversation>>("/v1/public/support/conversations/current", config(token));
  return response.data.data;
}

/** Lấy lịch sử conversation của visitor để hiển thị trong widget. */
export async function getSupportConversationHistory(token: string): Promise<SupportConversation[]> {
  const response = await httpClient.get<ApiResponse<PageResponse<SupportConversation>>>(
    "/v1/public/support/conversations/history", { ...config(token), params: { page: 0, size: 20 } },
  );
  return response.data.data.content;
}

/** Lấy chi tiết một conversation cũ sau khi Backend kiểm tra ownership. */
export async function getVisitorSupportConversation(token: string, conversationId: string): Promise<SupportConversation> {
  const response = await httpClient.get<ApiResponse<SupportConversation>>(
    `/v1/public/support/conversations/${conversationId}`, config(token),
  );
  return response.data.data;
}

/** Đóng phiên mở hiện tại và tạo conversation guided mới theo thao tác chủ động của visitor. */
export async function startNewSupportConversation(token: string): Promise<SupportConversation> {
  const response = await httpClient.post<ApiResponse<SupportConversation>>(
    "/v1/public/support/conversations/new", undefined, config(token),
  );
  return response.data.data;
}

/** Lấy message đã lưu trong database của visitor hiện tại. */
export async function getSupportMessages(token: string, conversationId: string): Promise<SupportMessage[]> {
  const response = await httpClient.get<ApiResponse<PageResponse<SupportMessage>>>(
    `/v1/public/support/conversations/${conversationId}/messages`, { ...config(token), params: { page: 0, size: 100 } },
  );
  return response.data.data.content;
}

/** Gửi optionId được backend định nghĩa, không gửi nguyên label hoặc prompt tự do. */
export async function sendQuickReply(token: string, conversationId: string, optionId: string): Promise<SupportMessage> {
  const response = await httpClient.post<ApiResponse<SupportMessage>>(
    `/v1/public/support/conversations/${conversationId}/quick-replies`, { optionId }, config(token),
  );
  return response.data.data;
}

/** Gửi mô tả nhu cầu để Backend gọi local embedding và trả quick intent gần nghĩa. */
export async function suggestGuidedIntents(token: string, conversationId: string, content: string): Promise<SupportMessage> {
  const response = await httpClient.post<ApiResponse<SupportMessage>>(
    `/v1/public/support/conversations/${conversationId}/guided-messages`, { content }, config(token),
  );
  return response.data.data;
}

/** Gửi contact visitor sau khi đã đồng ý kết nối tư vấn viên. */
export async function submitContact(token: string, conversationId: string, payload: {
  fullName: string; email: string; phone?: string; note?: string;
}): Promise<SupportConversation> {
  const response = await httpClient.post<ApiResponse<SupportConversation>>(
    `/v1/public/support/conversations/${conversationId}/contact`, payload, config(token),
  );
  return response.data.data;
}

/** Gửi tin nhắn visitor qua HTTP fallback khi WebSocket đang reconnect. */
export async function sendVisitorMessage(token: string, conversationId: string, content: string): Promise<SupportMessage> {
  const response = await httpClient.post<ApiResponse<SupportMessage>>(
    `/v1/public/support/conversations/${conversationId}/messages`, { content }, config(token),
  );
  return response.data.data;
}

/** Upload ảnh/tài liệu vào conversation đã kết nối tư vấn viên. */
export async function uploadVisitorAttachment(token: string, conversationId: string, file: File): Promise<SupportMessage> {
  const body = new FormData();
  body.append("file", file);
  const response = await httpClient.post<ApiResponse<SupportMessage>>(
    `/v1/public/support/conversations/${conversationId}/attachments`, body, config(token),
  );
  return response.data.data;
}

/** Hủy yêu cầu đang chờ tư vấn viên tiếp nhận. */
export async function cancelSupportConversation(token: string, conversationId: string): Promise<SupportConversation> {
  const response = await httpClient.post<ApiResponse<SupportConversation>>(
    `/v1/public/support/conversations/${conversationId}/cancel`, undefined, config(token),
  );
  return response.data.data;
}

/** Xác nhận đóng conversation theo yêu cầu của tư vấn viên. */
export async function closeVisitorSupportConversation(token: string, conversationId: string): Promise<SupportConversation> {
  const response = await httpClient.post<ApiResponse<SupportConversation>>(
    `/v1/public/support/conversations/${conversationId}/close`, undefined, config(token),
  );
  return response.data.data;
}

/** Từ chối đóng và tiếp tục trò chuyện với tư vấn viên. */
export async function continueVisitorSupportConversation(token: string, conversationId: string): Promise<SupportMessage> {
  return sendQuickReply(token, conversationId, "KEEP_ACTIVE");
}
