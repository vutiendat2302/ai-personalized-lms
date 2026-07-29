import httpClient from "@/api/httpClient";
import type { ApiResponse } from "@/types/base";

export interface AuditLogResponse {
  id: string;
  userId: string;
  userEmail: string;
  userFullName: string;
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
    start?: string;
    end?: string;
    page?: number;
    size?: number;
    sort?: string;
  }) =>
    httpClient.get<ApiResponse<any>>("/v1/audit-log", { params }),

  getAllAuditLogs: () =>
    httpClient.get<ApiResponse<AuditLogResponse[]>>("/v1/audit-log/all"),

  getAuditLogsByUserId: (userId: string) =>
    httpClient.get<ApiResponse<AuditLogResponse[]>>(`/v1/audit-log/users/${userId}`),

  getAuditLogsByEntity: (entityType: string, entityId: string, params?: { page?: number; size?: number; sort?: string }) =>
    httpClient.get<ApiResponse<any>>(`/v1/audit-log/entity/${entityType}/${entityId}`, { params }).then(res => res.data.data),
};
