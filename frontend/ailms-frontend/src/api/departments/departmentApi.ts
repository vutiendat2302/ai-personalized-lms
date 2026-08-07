import httpClient from "@/api/httpClient";
import type { ApiResponse } from "@/types/base";

export interface DepartmentResponse {
  id: string;
  code: string;
  name: string;
  description?: string;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  employeeCount?: number;
}

export interface CreateDepartmentRequest {
  name: string;
  description?: string;
}

export interface UpdateDepartmentRequest {
  name?: string;
  description?: string;
  status?: "ACTIVE" | "INACTIVE";
}

export interface DepartmentSearchRequest {
  page?: number;
  size?: number;
  keyword?: string;
  status?: "ACTIVE" | "INACTIVE";
  sort?: string | string[];
  hasEmployees?: boolean;
}

export interface PageResponse<T> {
  content: T[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export const departmentApi = {
  searchDepartments: (params?: DepartmentSearchRequest) =>
    httpClient.get<ApiResponse<PageResponse<DepartmentResponse>>>("/v1/departments/search", { params }),

  getAllDepartments: () =>
    httpClient.get<ApiResponse<DepartmentResponse[]>>("/v1/departments"),

  getDepartmentById: (id: string) =>
    httpClient.get<ApiResponse<DepartmentResponse>>(`/v1/departments/${id}`),

  createDepartment: (payload: CreateDepartmentRequest) =>
    httpClient.post<ApiResponse<DepartmentResponse>>("/v1/departments", payload),

  updateDepartment: (id: string, payload: UpdateDepartmentRequest) =>
    httpClient.put<ApiResponse<DepartmentResponse>>(`/v1/departments/${id}`, payload),

  deleteDepartment: (id: string) =>
    httpClient.delete<ApiResponse<void>>(`/v1/departments/${id}`),

  getEmployeesByDepartmentId: (id: string) =>
    httpClient.get<ApiResponse<any[]>>(`/v1/departments/${id}/employees`),

  getOverviewStats: (year?: number) =>
    httpClient.get<ApiResponse<{
      totalDepartments: number;
      activeDepartments: number;
      emptyDepartments: number;
      countEmployeeNotDepartment?: number;
      employeesByDepartment: Record<string, number>;
      employmentTypeBreakdown: Array<{ deptName: string; employmentType: string; count: number }>;
    }>>("/v1/departments/stats/overview", { params: year ? { year } : undefined }).then(res => res.data.data),

  transferEmployees: (targetDeptId: string, employeeIds: string[]) =>
    httpClient.post<ApiResponse<void>>("/v1/departments/transfer-employees", employeeIds, { params: { targetDeptId } }),

  removeEmployeesFromDepartment: (employeeIds: string[]) =>
    httpClient.post<ApiResponse<void>>("/v1/departments/remove-employees", employeeIds),

  getAuditLogsByEntity: (entityType: string, entityId: string) =>
    httpClient.get<ApiResponse<any>>(`/v1/audit-log/entity/${entityType}/${entityId}`),
};
