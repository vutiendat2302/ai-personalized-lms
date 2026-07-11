import httpClient from "@/api/httpClient";
import type { ApiResponse } from "@/types/base";
import type { PermissionResponse, PermissionRequest } from "@/types/admin";

export const permissionApi = {
  getPermissions: (params?: { entity?: string; action?: string; search?: string; page?: number; size?: number; sort?: string }) =>
    httpClient.get<ApiResponse<any>>("/permissions/page", { params }),

  getAllPermissions: () =>
    httpClient.get<ApiResponse<PermissionResponse[]>>("/permissions"),

  getPermissionById: (id: string) =>
    httpClient.get<ApiResponse<PermissionResponse>>(`/permissions/${id}`),

  createPermission: (payload: PermissionRequest) =>
    httpClient.post<ApiResponse<PermissionResponse>>("/permissions", payload),

  updatePermission: (id: string, payload: PermissionRequest) =>
    httpClient.put<ApiResponse<PermissionResponse>>(`/permissions/${id}`, payload),

  deletePermission: (id: string) =>
    httpClient.delete<ApiResponse<void>>(`/permissions/${id}`),
};
