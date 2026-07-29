import httpClient from "@/api/httpClient";
import type { ApiResponse } from "@/types/base";
import type { PermissionResponse, PermissionRequest } from "@/types/admin";

export const permissionApi = {
  getPermissions: (params?: { entity?: string; action?: string; search?: string; keyword?: string; assignedStatus?: string; page?: number; size?: number; sort?: string }) =>
    httpClient.get<ApiResponse<any>>("/v1/permissions/page", { params }),

  getAllPermissions: () =>
    httpClient.get<ApiResponse<PermissionResponse[]>>("/v1/permissions"),

  getPermissionById: (id: string) =>
    httpClient.get<ApiResponse<PermissionResponse>>(`/v1/permissions/${id}`),

  createPermission: (payload: PermissionRequest) =>
    httpClient.post<ApiResponse<PermissionResponse>>("/v1/permissions", payload),

  updatePermission: (id: string, payload: PermissionRequest) =>
    httpClient.put<ApiResponse<PermissionResponse>>(`/v1/permissions/${id}`, payload),

  deletePermission: (id: string) =>
    httpClient.delete<ApiResponse<void>>(`/v1/permissions/${id}`),

  getOverviewStats: () =>
    httpClient.get<ApiResponse<{
      totalPermissions: number;
      totalEntities: number;
      orphanPermissions: number;
      permissionsByEntity: Record<string, number>;
      topUsedPermissions: Record<string, number>;
      permissionsByAction: Record<string, number>;
    }>>("/v1/permissions/stats/overview").then(res => res.data.data),

  getRolesByPermissionId: (id: string) =>
    httpClient.get<ApiResponse<any[]>>(`/v1/permissions/${id}/roles`).then(res => res.data.data),

  removeRoleFromPermission: (permissionId: string, roleId: string) =>
    httpClient.delete<ApiResponse<void>>(`/v1/permissions/${permissionId}/roles/${roleId}`),

  assignRoleToPermission: (permissionId: string, roleId: string) =>
    httpClient.post<ApiResponse<void>>(`/v1/permissions/${permissionId}/roles/${roleId}`),

  bulkDeletePermissions: (permissionIds: string[]) =>
    httpClient.post<ApiResponse<void>>("/v1/permissions/bulk-delete", permissionIds),

  getMetadata: async () => {
    try {
      const res = await httpClient.get<ApiResponse<{ entities: string[]; actions: string[] }>>("/v1/permissions/metadata");
      return res?.data?.data || (res as any)?.data || res;
    } catch (err) {
      console.error("Lỗi getMetadata permission:", err);
      return null;
    }
  },
};

