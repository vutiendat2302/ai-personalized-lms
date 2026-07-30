import httpClient from "@/api/httpClient";
import type { ApiResponse } from "@/types/base";

export interface AuditLogResponse {
  id: string;
  userId: string;
  userEmail: string;
  userFullName: string;
  userAvatarUrl?: string;
  action: string;
  entityType: string;
  entityId: number;
  oldValue: string | null;
  newValue: string | null;
  ipAddress: string;
  userAgent: string;
  occurredAt: string;
}

export const auditLogApi = {
  getByLogId: (id: number) =>
    httpClient.get<ApiResponse<AuditLogResponse>>(`/v1/audit-log/${id}`),

  getAuditLogs: (params?: {
    entityType?: string;
    entityId?: string;
    action?: string;
    actions?: string[];
    ipAddress?: string;
    userQuery?: string;
    occurredFrom?: string;
    occurredTo?: string;
    page?: number;
    size?: number;
    sort?: string;
  }) =>
    httpClient.get<ApiResponse<any>>("/v1/audit-log", { params }),

  getAllAuditLogs: () =>
    httpClient.get<ApiResponse<AuditLogResponse[]>>("/v1/audit-log/all"),

  getAuditLogsByUserId: (userId: string, params?: { page?: number; size?: number; sort?: string }) =>
    httpClient.get<ApiResponse<any>>(`/v1/audit-log/users/${userId}/page`, { params }),

  getAuditLogsByEntity: (entityType: string, entityId: string, params?: { page?: number; size?: number; sort?: string }) =>
    httpClient.get<ApiResponse<any>>(`/v1/audit-log/entity/${entityType}/${entityId}`, { params }).then(res => res.data.data),

  exportAuditLogs: (params?: {
    entityType?: string;
    entityId?: string;
    action?: string;
    actions?: string[];
    ipAddress?: string;
    userQuery?: string;
    occurredFrom?: string;
    occurredTo?: string;
    sort?: string;
  }) =>
    httpClient.get("/v1/audit-log/export", { params, responseType: "blob" }),
};
