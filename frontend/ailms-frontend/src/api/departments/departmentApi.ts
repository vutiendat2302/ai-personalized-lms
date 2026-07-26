import httpClient from "@/api/httpClient";
import type { ApiResponse } from "@/types/base";

export interface DepartmentResponse {
  id: number;
  code: string;
  name: string;
  description?: string;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
  updatedAt: string;
  createdBy?: number;
  updatedBy?: number;
}

export interface CreateDepartmentRequest {
  code?: string;
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
  sort?: string[];
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

  getDepartmentById: (id: number | string) =>
    httpClient.get<ApiResponse<DepartmentResponse>>(`/v1/departments/${id}`),

  createDepartment: (payload: CreateDepartmentRequest) =>
    httpClient.post<ApiResponse<DepartmentResponse>>("/v1/departments", payload),

  updateDepartment: (id: number | string, payload: UpdateDepartmentRequest) =>
    httpClient.put<ApiResponse<DepartmentResponse>>(`/v1/departments/${id}`, payload),

  deleteDepartment: (id: number | string) =>
    httpClient.delete<ApiResponse<void>>(`/v1/departments/${id}`),

  getEmployeesByDepartmentId: (id: number | string) =>
    httpClient.get<ApiResponse<any[]>>(`/v1/departments/${id}/employees`),
};
