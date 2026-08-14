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

  /** Tìm kiếm bài tập do chính Teacher/TA đang đăng nhập tạo. */
  searchAuthoredAssignments: (params?: AssignmentSearchRequest) =>
    httpClient.get<ApiResponse<PageResponse<AssignmentResponseItem>>>("/v1/teacher/assessment-library/assignments/search", { params }),

  /** Tạo bài tập trong thư viện cá nhân của Teacher/TA. */
  createAuthoredAssignment: (data: any) =>
    httpClient.post<ApiResponse<AssignmentResponseItem>>("/v1/teacher/assessment-library/assignments", data),

  /** Sửa bài tập thuộc quyền sở hữu của Teacher/TA. */
  updateAuthoredAssignment: (id: string | number, data: any) =>
    httpClient.put<ApiResponse<AssignmentResponseItem>>(`/v1/teacher/assessment-library/assignments/${id}`, data),

  /** Xóa bài tập thuộc quyền sở hữu của Teacher/TA. */
  deleteAuthoredAssignment: (id: string | number) =>
    httpClient.delete<ApiResponse<void>>(`/v1/teacher/assessment-library/assignments/${id}`),
};
