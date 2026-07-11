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
  getRoles: (params?: { isSystem?: boolean; search?: string; page?: number; size?: number; sort?: string }) =>
    httpClient.get<ApiResponse<any>>("/roles/page", { params }),

  getAllRoles: () =>
    httpClient.get<ApiResponse<RoleResponse[]>>("/roles"),

  getRoleById: (id: string) =>
    httpClient.get<ApiResponse<RoleResponse>>(`/roles/${id}`),

  createRole: (payload: RoleRequest) =>
    httpClient.post<ApiResponse<RoleResponse>>("/roles", payload),

  updateRole: (id: string, payload: RoleRequest) =>
    httpClient.put<ApiResponse<RoleResponse>>(`/roles/${id}`, payload),

  deleteRole: (id: string) =>
    httpClient.delete<ApiResponse<void>>(`/roles/${id}`),

  assignPermissions: (id: string, payload: AssignPermissionsRequest) =>
    httpClient.post<ApiResponse<void>>(`/roles/${id}/permissions`, payload),

  cloneRole: (id: string, payload: CloneRoleRequest) =>
    httpClient.post<ApiResponse<RoleResponse>>(`/roles/${id}/clone`, payload),

  getUsersByRoleId: (id: string) =>
    httpClient.get<ApiResponse<UserResponse[]>>(`/roles/${id}/users`),

  getPermissionsByRoleId: (roleId: string) =>
    httpClient.get<ApiResponse<PermissionResponse[]>>(`/roles/${roleId}/permissions`),

  createAndAssignPermission: (id: string, payload: PermissionRequest) =>
    httpClient.post<ApiResponse<PermissionResponse>>(`/roles/${id}/permissions/create`, payload),
};
