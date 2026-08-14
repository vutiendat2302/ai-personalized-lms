import httpClient from "@/api/httpClient";
import type { ApiResponse } from "@/types/base";
import type { SupportConversation, SupportMessage, SupportResource } from "./supportApi";

export type SupportQueue = { conversations: SupportConversation[] };

/** Lấy ticket đang chờ của support consultant. */
export async function getSupportQueue(): Promise<SupportQueue> {
  const response = await httpClient.get<ApiResponse<SupportQueue>>("/v1/support/queue");
  return response.data.data;
}

/** Lấy các conversation đã được phân công cho support consultant. */
export async function getAssignedSupportConversations(): Promise<SupportQueue> {
  const response = await httpClient.get<ApiResponse<SupportQueue>>("/v1/support/conversations");
  return response.data.data;
}

/** Cập nhật presence để hệ thống biết support có thể nhận ticket. */
export async function updateSupportPresence(status: "ONLINE_AVAILABLE" | "AWAY" | "OFFLINE"): Promise<void> {
  await httpClient.post("/v1/support/presence", { status });
}

/** Claim ticket từ hàng đợi chung; backend bảo đảm mỗi supporter chỉ có một phiên active. */
export async function acceptSupportConversation(conversationId: string): Promise<SupportConversation> {
  const response = await httpClient.post<ApiResponse<SupportConversation>>(`/v1/support/conversations/${conversationId}/accept`);
  return response.data.data;
}

/** Gửi message fallback HTTP khi WebSocket đang reconnect. */
export async function sendSupportAgentMessage(conversationId: string, content: string): Promise<SupportMessage> {
  const response = await httpClient.post<ApiResponse<SupportMessage>>(`/v1/support/conversations/${conversationId}/messages`, { content });
  return response.data.data;
}

/** Upload ảnh/tài liệu của tư vấn viên vào conversation. */
export async function uploadSupportAttachment(conversationId: string, file: File): Promise<SupportMessage> {
  const body = new FormData();
  body.append("file", file);
  const response = await httpClient.post<ApiResponse<SupportMessage>>(
    `/v1/support/conversations/${conversationId}/attachments`, body,
  );
  return response.data.data;
}

/** Tìm khóa học có gói đang bán qua Meilisearch của Backend. */
export async function searchSupportResources(query = "", limit = 12): Promise<SupportResource[]> {
  const response = await httpClient.get<ApiResponse<SupportResource[]>>("/v1/support/resources", {
    params: { query, limit },
  });
  return response.data.data;
}

/** Gửi card tài nguyên đã được Backend xác thực. */
export async function sendSupportResource(
  conversationId: string, resource: Pick<SupportResource, "type" | "id">,
): Promise<SupportMessage> {
  const response = await httpClient.post<ApiResponse<SupportMessage>>(
    `/v1/support/conversations/${conversationId}/resources`,
    { resourceType: resource.type, resourceId: resource.id },
  );
  return response.data.data;
}

/** Yêu cầu visitor xác nhận trước khi đóng. */
export async function requestSupportClose(conversationId: string): Promise<SupportConversation> {
  const response = await httpClient.post<ApiResponse<SupportConversation>>(`/v1/support/conversations/${conversationId}/request-close`);
  return response.data.data;
}

/** Đóng conversation support. */
export async function closeSupportConversation(conversationId: string): Promise<SupportConversation> {
  const response = await httpClient.post<ApiResponse<SupportConversation>>(`/v1/support/conversations/${conversationId}/close`);
  return response.data.data;
}

/** Lấy message của conversation được phân công. */
export async function getSupportAgentMessages(conversationId: string): Promise<SupportMessage[]> {
  const response = await httpClient.get<ApiResponse<{ content: SupportMessage[] }>>(`/v1/support/conversations/${conversationId}/messages`, {
    params: { page: 0, size: 100 },
  });
  return response.data.data.content;
}
