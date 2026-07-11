import httpClient from "@/api/httpClient";
import type { ApiResponse } from "@/types/base";

export interface AuditLogResponse {
  id: number;
  userId: number;
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
    httpClient.get<ApiResponse<AuditLogResponse>>(`/audit-log/${id}`),

  getAuditLogs: (params?: {
    entityType?: string;
    entityId?: number;
    action?: string;
    start?: string;
    end?: string;
    page?: number;
    size?: number;
    sort?: string;
  }) =>
    httpClient.get<ApiResponse<any>>("/audit-log", { params }),

  getAllAuditLogs: () =>
    httpClient.get<ApiResponse<AuditLogResponse[]>>("/audit-log/all"),

  getAuditLogsByUserId: (userId: number) =>
    httpClient.get<ApiResponse<AuditLogResponse[]>>(`/audit-log/users/${userId}`),
};
