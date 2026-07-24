import httpClient from "@/api/httpClient";
import type { ApiResponse } from "@/types/base";
import type {
  UserResponse,
  CreateUserRequest,
  UpdateUserRequest,
  UpdateProfileRequest,
  InviteUserRequest,
  BulkDeleteRequest,
  BulkAssignRoleRequest,
  AssignRolesRequest
} from "@/types/admin";

export const userApi = {
  getUserById: (id: string) =>
    httpClient.get<ApiResponse<UserResponse>>(`/v1/users/${id}`),

  createUser: (payload: CreateUserRequest) =>
    httpClient.post<ApiResponse<UserResponse>>("/v1/users", payload),

  updateUser: (id: string, payload: UpdateUserRequest) =>
    httpClient.put<ApiResponse<UserResponse>>(`/v1/users/${id}`, payload),

  deleteUser: (id: string) =>
    httpClient.delete<ApiResponse<void>>(`/v1/users/${id}`),

  getProfile: () =>
    httpClient.get<ApiResponse<UserResponse>>("/v1/users/profile"),

  updateProfile: (payload: UpdateProfileRequest) =>
    httpClient.put<ApiResponse<UserResponse>>("/v1/users/profile", payload),

  getAllUsers: () =>
    httpClient.get<ApiResponse<UserResponse[]>>("/v1/users"),

  getUsers: (params?: any) =>
    httpClient.get<ApiResponse<any>>("/v1/users/page", { params }),

  inviteUser: (payload: InviteUserRequest) =>
    httpClient.post<ApiResponse<void>>("/v1/users/invite", payload),

  bulkDelete: (payload: BulkDeleteRequest) =>
    httpClient.post<ApiResponse<any>>("/v1/users/bulk-delete", payload),

  bulkAssignRole: (payload: BulkAssignRoleRequest) =>
    httpClient.post<ApiResponse<any>>("/v1/users/bulk-assign-role", payload),

  assignRoles: (id: string, payload: AssignRolesRequest) =>
    httpClient.post<ApiResponse<void>>(`/v1/users/${id}/roles`, payload),
};
