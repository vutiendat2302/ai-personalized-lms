import httpClient from "@/api/httpClient";
import type { ApiResponse } from "@/types/base";

export interface TrashItemDTO {
  id: string;
  entityType: string;
  code: string;
  name: string;
  email?: string;
  deletedAt: string;
  deletedBy?: string;
  daysInTrash: number;
  hasChildRecords: boolean;
  childRecordCounts?: Record<string, number>;
  extraFields?: Record<string, any>;
}

export interface ChildRecordDetailDTO {
  tableName: string;
  displayName: string;
  count: number;
  items: Record<string, any>[];
}

export const trashApi = {
  getTrashItems: (params?: { entityType?: string; keyword?: string; page?: number; size?: number }) =>
    httpClient.get<ApiResponse<any>>("/v1/trash", { params }),

  getTrashDetail: (entityType: string, id: string) =>
    httpClient.get<ApiResponse<TrashItemDTO>>(`/v1/trash/${entityType}/${id}`),

  checkChildRecords: (entityType: string, id: string) =>
    httpClient.get<ApiResponse<Record<string, number>>>(`/v1/trash/${entityType}/${id}/check-children`),

  getChildRecordDetails: (entityType: string, id: string) =>
    httpClient.get<ApiResponse<ChildRecordDetailDTO[]>>(`/v1/trash/${entityType}/${id}/child-records-detail`),

  hardDelete: (entityType: string, id: string) =>
    httpClient.delete<ApiResponse<void>>(`/v1/trash/${entityType}/${id}`),

  restore: (entityType: string, id: string) =>
    httpClient.post<ApiResponse<void>>(`/v1/trash/${entityType}/${id}/restore`),

  bulkHardDelete: (payload: { entityType: string; ids: string[] }) =>
    httpClient.post<ApiResponse<any>>("/v1/trash/bulk-hard-delete", {
      entityType: payload.entityType,
      ids: payload.ids.map(id => id)
    }),

  bulkRestore: (payload: { entityType: string; ids: string[] }) =>
    httpClient.post<ApiResponse<any>>("/v1/trash/bulk-restore", {
      entityType: payload.entityType,
      ids: payload.ids.map(id => id)
    }),
};
