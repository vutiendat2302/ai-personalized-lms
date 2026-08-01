import httpClient from "@/api/httpClient";
import type { ApiResponse } from "@/types/base";
import type {
  CourseResponse,
  CreateCourseRequest,
  UpdateCourseRequest,
  CategoryResponse,
  CreateCategoryRequest,
  UpdateCategoryRequest
} from "@/types/admin";

export const courseApi = {
  // Course Endpoints
  createCourse: (payload: CreateCourseRequest) =>
    httpClient.post<ApiResponse<CourseResponse>>("/v1/courses", payload),

  createTeacherCourse: (teacherUserId: string, payload: CreateCourseRequest) =>
    httpClient.post<ApiResponse<CourseResponse>>("/v1/courses/teacher", payload, { params: { teacherUserId } }),

  approveCourse: (id: string, approve: boolean, rejectionReason?: string) =>
    httpClient.post<ApiResponse<CourseResponse>>(`/v1/courses/${id}/approve`, { approve, rejectionReason }),

  getSuggestedClasses: (teacherUserId: string) =>
    httpClient.get<ApiResponse<any[]>>("/v1/courses/suggested-classes", { params: { teacherUserId } }),

  claimClass: (classId: string, teacherUserId: string) =>
    httpClient.post<ApiResponse<any>>(`/v1/courses/classes/${classId}/claim`, null, { params: { teacherUserId } }),

  updateCourse: (id: string, payload: UpdateCourseRequest) =>
    httpClient.put<ApiResponse<CourseResponse>>(`/v1/courses/${id}`, payload),

  updateCourseStatus: (id: string, status: string) =>
    httpClient.patch<ApiResponse<CourseResponse>>(`/v1/courses/${id}/status`, { status }),

  deleteCourse: (id: string) =>
    httpClient.delete<ApiResponse<void>>(`/v1/courses/${id}`),

  getCourseById: (id: string) =>
    httpClient.get<ApiResponse<CourseResponse>>(`/v1/courses/${id}`),

  getAllCourses: () =>
    httpClient.get<ApiResponse<CourseResponse[]>>("/v1/courses"),

  searchCourses: (params?: {
    categoryId?: string;
    name?: string;
    level?: string;
    status?: string;
    page?: number;
    size?: number;
    sortBy?: string;
    sortDirection?: string;
    keyword?: string;
    createdBy?: string;
  }) =>
    httpClient.get<ApiResponse<any>>("/v1/courses/search", { params }),

  getOutstandingCourses: (params?: { page?: number; size?: number }) =>
    httpClient.get<ApiResponse<any>>("/v1/courses/outstanding", { params }),

  getTrendingCourses: (params?: { page?: number; size?: number }) =>
    httpClient.get<ApiResponse<any>>("/v1/courses/trending", { params }),

  getLatestCourses: (params?: { page?: number; size?: number }) =>
    httpClient.get<ApiResponse<any>>("/v1/courses/latest", { params }),

  getActiveCoursesCount: () =>
    httpClient.get<ApiResponse<number>>("/v1/courses/active-count"),

  // Category Endpoints
  createCategory: (payload: CreateCategoryRequest) =>
    httpClient.post<ApiResponse<CategoryResponse>>("/v1/categories", payload),

  updateCategory: (id: string, payload: UpdateCategoryRequest) =>
    httpClient.put<ApiResponse<CategoryResponse>>(`/v1/categories/${id}`, payload),

  updateCategoryStatus: (id: string, status: string) =>
    httpClient.patch<ApiResponse<CategoryResponse>>(`/v1/categories/${id}/status`, { status }),

  deleteCategory: (id: string) =>
    httpClient.delete<ApiResponse<void>>(`/v1/categories/${id}`),

  getCategoryById: (id: string) =>
    httpClient.get<ApiResponse<CategoryResponse>>(`/v1/categories/${id}`),

  getAllCategories: () =>
    httpClient.get<ApiResponse<CategoryResponse[]>>("/v1/categories"),

  searchCategories: (params?: {
    name?: string;
    status?: string;
    page?: number;
    size?: number;
    sortBy?: string;
    sortDirection?: string;
  }) =>
    httpClient.get<ApiResponse<any>>("/v1/categories/search", { params }),
};
