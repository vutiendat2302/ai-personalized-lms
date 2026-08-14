import httpClient from "@/api/httpClient";
import type { ApiResponse } from "@/types/base";

export interface PublicCategory {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  iconUrl: string | null;
  publicCourseCount: number;
  popularityScore: number;
}

export interface PublicTeacher {
  id: string;
  fullName: string | null;
  avatarUrl: string | null;
  title: string | null;
  bio: string | null;
  experienceYears: number | null;
  categories: PublicCategory[];
  courseCount: number;
  studentCount: number;
  averageRating: number;
}

export interface PublicCourseCard {
  id: string;
  name: string;
  slug: string | null;
  thumbnailUrl: string | null;
  description: string | null;
  level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | null;
  currentPrice: number | null;
  originalPrice: number | null;
  teacherName: string | null;
  averageRating: number | null;
  reviewCount: number | null;
  studentCount: number | null;
  categoryName: string | null;
  deliveryModes: string[];
}

export interface PublicPage<T> {
  content: T[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

/** API catalog công khai dùng cho landing/category/teacher, không chứa dữ liệu mock. */
export const publicCatalogApi = {
  getTeachers: (params?: { keyword?: string; page?: number; size?: number }) =>
    httpClient.get<ApiResponse<PublicPage<PublicTeacher>>>("/v1/public/teachers", { params }),
  getTeacher: (id: string) =>
    httpClient.get<ApiResponse<PublicTeacher>>(`/v1/public/teachers/${encodeURIComponent(id)}`),
  getTeacherCourses: (id: string, params?: { page?: number; size?: number; level?: "BEGINNER" | "INTERMEDIATE" | "ADVANCED"; categoryId?: string }) =>
    httpClient.get<ApiResponse<PublicPage<PublicCourseCard>>>(`/v1/public/teachers/${encodeURIComponent(id)}/courses`, { params }),
  getCategoryCourseCounts: () =>
    httpClient.get<ApiResponse<PublicCategory[]>>("/v1/public/categories/course-counts"),
  getHotCategories: (params?: { page?: number; size?: number }) =>
    httpClient.get<ApiResponse<PublicPage<PublicCategory>>>("/v1/public/categories/hot", { params }),
  getCategoryCourses: (id: string, params?: { page?: number; size?: number; level?: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" }) =>
    httpClient.get<ApiResponse<PublicPage<PublicCourseCard>>>(`/v1/public/categories/${encodeURIComponent(id)}/courses`, { params }),
  getCourseRelatedCourses: (id: string, params?: { page?: number; size?: number }) =>
    httpClient.get<ApiResponse<PublicPage<PublicCourseCard>>>(`/v1/public/courses/${encodeURIComponent(id)}/related-courses`, { params }),
  getCategoryRelatedCourses: (id: string, params?: { page?: number; size?: number }) =>
    httpClient.get<ApiResponse<PublicPage<PublicCourseCard>>>(`/v1/public/categories/${encodeURIComponent(id)}/related-courses`, { params }),
  getRelatedCategories: (id: string, limit = 6) =>
    httpClient.get<ApiResponse<PublicCategory[]>>(`/v1/public/categories/${encodeURIComponent(id)}/related-categories`, { params: { limit } }),
};
