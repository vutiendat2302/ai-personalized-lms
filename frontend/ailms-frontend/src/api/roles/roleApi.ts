import httpClient from "@/api/httpClient";
import type { ApiResponse } from "@/types/base";
import type {
  RoleResponse,
  RoleRequest,
  AssignPermissionsRequest,
  CloneRoleRequest,
  UserResponse,
  PermissionResponse,
  PermissionRequest
} from "@/types/admin";

export const roleApi = {
  getRoles: (params?: { isSystem?: boolean; keyword?: string; page?: number; size?: number; sort?: string }) =>
    httpClient.get<ApiResponse<any>>("/v1/roles/page", { params }),

  getAllRoles: () =>
    httpClient.get<ApiResponse<RoleResponse[]>>("/v1/roles"),

  getRoleById: (id: string) =>
    httpClient.get<ApiResponse<RoleResponse>>(`/v1/roles/${id}`),

  createRole: (payload: RoleRequest) =>
    httpClient.post<ApiResponse<RoleResponse>>("/v1/roles", payload),

  updateRole: (id: string, payload: RoleRequest) =>
    httpClient.put<ApiResponse<RoleResponse>>(`/v1/roles/${id}`, payload),

  deleteRole: (id: string) =>
    httpClient.delete<ApiResponse<void>>(`/v1/roles/${id}`),

  assignPermissions: (id: string, payload: AssignPermissionsRequest) =>
    httpClient.post<ApiResponse<void>>(`/v1/roles/${id}/permissions`, payload),

  cloneRole: (id: string, payload: CloneRoleRequest) =>
    httpClient.post<ApiResponse<RoleResponse>>(`/v1/roles/${id}/clone`, payload),

  getUsersByRoleId: (id: string) =>
    httpClient.get<ApiResponse<UserResponse[]>>(`/v1/roles/${id}/users`),

  getPermissionsByRoleId: (roleId: string) =>
    httpClient.get<ApiResponse<PermissionResponse[]>>(`/v1/roles/${roleId}/permissions`),

  createAndAssignPermission: (id: string, payload: PermissionRequest) =>
    httpClient.post<ApiResponse<PermissionResponse>>(`/v1/roles/${id}/permissions/create`, payload),

  getOverviewStats: () =>
    httpClient.get<ApiResponse<{ totalRoles: number; systemRoles: number; customRoles: number; unusedRoles: number; emptyRoles: number }>>("/v1/roles/stats/overview")
      .then(res => res.data.data),

  getPermissionsDistribution: () =>
    httpClient.get<ApiResponse<Record<string, number>>>("/v1/roles/stats/permissions-distribution")
      .then(res => res.data.data),

  getUsersDistribution: () =>
    httpClient.get<ApiResponse<Record<string, number>>>("/v1/roles/stats/users-distribution")
      .then(res => res.data.data),

  removeUserFromRole: (roleId: string, userId: string) =>
    httpClient.delete<ApiResponse<void>>(`/v1/roles/${roleId}/users/${userId}`),

  removeAllUsersFromRole: (roleId: string) =>
    httpClient.delete<ApiResponse<void>>(`/v1/roles/${roleId}/users`),

  bulkDeleteRoles: (roleIds: (string | number)[]) =>
    httpClient.post<ApiResponse<void>>("/v1/roles/bulk-delete", roleIds),
};
