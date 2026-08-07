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
  AssignRolesRequest,
  UserDetailResponse,
  MonthlyUserCountResponse,
  SendBulkEmailRequest,
  BulkCreateEmployeeRequest
} from "@/types/admin";

export const userApi = {
  getUserById: (id: string | number) =>
    httpClient.get<ApiResponse<UserResponse>>(`/v1/users/${id}`),

  createUser: (payload: CreateUserRequest) =>
    httpClient.post<ApiResponse<UserResponse>>("/v1/users", payload),

  updateUser: (id: string | number, payload: UpdateUserRequest) =>
    httpClient.put<ApiResponse<UserResponse>>(`/v1/users/${id}`, payload),

  deleteUser: (id: string | number) =>
    httpClient.delete<ApiResponse<void>>(`/v1/users/${id}`),

  getProfile: () =>
    httpClient.get<ApiResponse<UserResponse>>("/v1/users/profile"),

  updateProfile: (payload: UpdateProfileRequest) =>
    httpClient.put<ApiResponse<UserResponse>>("/v1/users/profile", payload),

  getAllUsers: () =>
    httpClient.get<ApiResponse<UserResponse[]>>("/v1/users"),

  getUsers: (params?: any) =>
    httpClient.get<ApiResponse<any>>("/v1/users/page", { params }),

  getUsersPage: (params?: any) =>
    httpClient.get<ApiResponse<any>>("/v1/users/page", { params }),


  getStudentsPage: (params?: any) =>
    httpClient.get<ApiResponse<any>>("/v1/users/students/page", { params }),

  getEmployeesPage: (params?: any) =>
    httpClient.get<ApiResponse<any>>("/v1/users/employees/page", { params }),

  inviteUser: (payload: InviteUserRequest) =>
    httpClient.post<ApiResponse<void>>("/v1/users/invite", payload),

  bulkDelete: (payload: BulkDeleteRequest) =>
    httpClient.post<ApiResponse<any>>("/v1/users/bulk-delete", payload),

  bulkAssignRole: (payload: BulkAssignRoleRequest) =>
    httpClient.post<ApiResponse<any>>("/v1/users/bulk-assign-role", payload),

  bulkRemoveRole: (payload: any) =>
    httpClient.post<ApiResponse<any>>("/v1/users/bulk-remove-role", payload),

  assignRoles: (id: string | number, payload: AssignRolesRequest) =>
    httpClient.post<ApiResponse<void>>(`/v1/users/${id}/roles`, payload),

  // Count & Stats API
  getStudentCount: () =>
    httpClient.get<ApiResponse<number>>("/v1/users/students/count"),

  getStatsByRole: () =>
    httpClient.get<ApiResponse<Record<string, number>>>("/v1/users/stats/by-role"),

  getStatsByGender: () =>
    httpClient.get<ApiResponse<Record<string, number>>>("/v1/users/stats/by-gender"),

  getStatsByStatus: () =>
    httpClient.get<ApiResponse<Record<string, number>>>("/v1/users/stats/by-status"),

  getStatsByAgeGroup: () =>
    httpClient.get<ApiResponse<Record<string, number>>>("/v1/users/stats/by-age-group"),

  
  getMonthlyNewUsers: (year?: number) =>
    httpClient.get<ApiResponse<MonthlyUserCountResponse[]>>("/v1/users/stats/monthly-new-users", {
      params: year ? { year } : {}
    }),

  // Detail & Bulk Actions API
  getUserDetail: (id: string | number) =>
    httpClient.get<ApiResponse<UserDetailResponse>>(`/v1/users/${id}/detail`),

  sendBulkEmail: (payload: SendBulkEmailRequest) =>
    httpClient.post<ApiResponse<void>>("/v1/users/send-bulk-email", payload),

  bulkCreateEmployees: (payload: BulkCreateEmployeeRequest) =>
    httpClient.post<ApiResponse<any>>("/v1/users/bulk-create-employees", payload),

  exportUsersToExcel: (params?: any) =>
    httpClient.get("/v1/users/export-excel", {
      params,
      responseType: "blob"
    }),

  exportUserDetailToExcel: (id: string | number) =>
    httpClient.get(`/v1/users/${id}/export-detail`, {
      responseType: "blob"
    }),

  // Trash & Hard Delete API for Users & System Entities
  getTrashUsers: () =>
    httpClient.get<ApiResponse<UserResponse[]>>("/v1/users/trash"),

  hardDeleteUser: (id: string | number) =>
    httpClient.delete<ApiResponse<void>>(`/v1/users/trash/${id}`),

  bulkHardDeleteUsers: (ids: (string | number)[]) =>
    httpClient.post<ApiResponse<any>>(
      "/v1/users/trash/bulk-hard-delete",
      ids.map((id) => String(id))
    ),

  restoreUser: (id: string | number) =>
    httpClient.post<ApiResponse<void>>(`/v1/users/trash/${id}/restore`),

  bulkRestoreUsers: (ids: (string | number)[]) =>
    httpClient.post<ApiResponse<any>>("/v1/users/trash/bulk-restore", ids.map(id => String(id))),

  checkChildRecords: (id: string | number, entityType: string) =>
    httpClient.get<ApiResponse<{ hasChildren: boolean; childTables: string[] }>>(`/v1/users/trash/${id}/check-children`, { params: { entityType } })
      .then(res => res.data.data),
};


