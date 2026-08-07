import httpClient from "@/api/httpClient";
import type { ApiResponse, PageResponse } from "@/types/base";

export interface AssignmentSearchRequest {
  keyword?: string;
  courseId?: string | number;
  lessonId?: string | number;
  sectionId?: string | number;
  status?: string;
  page?: number;
  size?: number;
  sort?: string[] | string;
}

export interface AssignmentResponseItem {
  id: string | number;
  lessonId?: string | number;
  courseId?: string | number;
  sectionId?: string | number;
  title: string;
  description?: string;
  maxScore?: number;
  dueDate?: string;
  allowLate?: boolean;
  status?: string;
  instructions?: string;
  attachmentUrls?: string[];
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const assignmentApi = {
  searchAssignments: (params?: AssignmentSearchRequest) =>
    httpClient.get<ApiResponse<PageResponse<AssignmentResponseItem>>>("/v1/assignments/search", { params }),

  getAllAssignments: () =>
    httpClient.get<ApiResponse<AssignmentResponseItem[]>>("/v1/assignments"),

  getAssignmentById: (id: string | number) =>
    httpClient.get<ApiResponse<AssignmentResponseItem>>(`/v1/assignments/${id}`),

  createAssignment: (data: any) =>
    httpClient.post<ApiResponse<AssignmentResponseItem>>("/v1/assignments", data),

  updateAssignment: (id: string | number, data: any) =>
    httpClient.put<ApiResponse<AssignmentResponseItem>>(`/v1/assignments/${id}`, data),

  deleteAssignment: (id: string | number) =>
    httpClient.delete<ApiResponse<void>>(`/v1/assignments/${id}`),
};
