import httpClient from "@/api/httpClient";
import type { ApiResponse } from "@/types/base";

export interface NotificationItem {
  id: string;
  source: "ADMIN" | "SYSTEM";
  type: string;
  title: string;
  content: string;
  targetUrl?: string;
  isRead: boolean;
  createdAt: string;
}

interface NotificationPage {
  content: NotificationItem[];
  totalElements: number;
  totalPages: number;
}

export const notificationApi = {
  getMine: async (page = 0, size = 8) => {
    const response = await httpClient.get<ApiResponse<NotificationPage>>("/v1/notifications", { params: { page, size } });
    return response.data.data;
  },
  getUnreadCount: async () => {
    const response = await httpClient.get<ApiResponse<{ unreadCount: number }>>("/v1/notifications/unread-count");
    return response.data.data.unreadCount;
  },
  markRead: (id: string) => httpClient.patch(`/v1/notifications/${id}/status`, { isRead: true }),
  markAllRead: () => httpClient.patch("/v1/notifications/mark-all-read"),
};
