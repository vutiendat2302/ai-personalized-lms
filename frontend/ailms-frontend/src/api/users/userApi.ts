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
    httpClient.get<ApiResponse<UserResponse>>(`/users/${id}`),

  createUser: (payload: CreateUserRequest) =>
    httpClient.post<ApiResponse<UserResponse>>("/users", payload),

  updateUser: (id: string, payload: UpdateUserRequest) =>
    httpClient.put<ApiResponse<UserResponse>>(`/users/${id}`, payload),

  deleteUser: (id: string) =>
    httpClient.delete<ApiResponse<void>>(`/users/${id}`),

  getProfile: () =>
    httpClient.get<ApiResponse<UserResponse>>("/users/profile"),

  updateProfile: (payload: UpdateProfileRequest) =>
    httpClient.put<ApiResponse<UserResponse>>("/users/profile", payload),

  getAllUsers: () =>
    httpClient.get<ApiResponse<UserResponse[]>>("/users"),

  getUsers: (params?: any) =>
    httpClient.get<ApiResponse<any>>("/users/page", { params }),

  inviteUser: (payload: InviteUserRequest) =>
    httpClient.post<ApiResponse<void>>("/users/invite", payload),

  bulkDelete: (payload: BulkDeleteRequest) =>
    httpClient.post<ApiResponse<any>>("/users/bulk-delete", payload),

  bulkAssignRole: (payload: BulkAssignRoleRequest) =>
    httpClient.post<ApiResponse<any>>("/users/bulk-assign-role", payload),

  assignRoles: (id: string, payload: AssignRolesRequest) =>
    httpClient.post<ApiResponse<void>>(`/users/${id}/roles`, payload),
};
