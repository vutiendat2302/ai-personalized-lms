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

export interface CourseMetrics {
  courseId: string;
  moduleCount: number;
  averageRating: number;
  reviewCount: number;
  level?: string;
  deliveryMode?: "SELF_STUDY" | "GROUP_CLASS" | "ONE_ON_ONE" | "COMBO";
  satisfactionPercent: number;
}

export interface CourseDetailLesson {
  id: string;
  name: string;
  title: string;
  contentType: string;
  durationMin?: number | null;
  duration?: number | null;
  orderIndex: number;
  preview: boolean;
  accessible: boolean;
  locked: boolean;
}

export interface CourseDetailSection {
  id: string;
  name: string;
  orderIndex: number;
  lessons: CourseDetailLesson[];
}

export interface CourseClassPerson {
  id: string;
  fullName: string;
  avatarUrl?: string | null;
}

export interface CourseClassDetail {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  courseId: string;
  courseName: string;
  timeZone: string;
  deliveryMode: "GROUP_CLASS";
  teacher?: CourseClassPerson | null;
  teachingAssistants: CourseClassPerson[];
  startDate?: string | null;
  endDate?: string | null;
  schedules: Array<{
    id: string;
    classId: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    status: string;
  }>;
  currentStudents: number;
  maxMembers: number;
  remainingSlots: number;
  status: string;
  registrationOpen: boolean;
  allowLateEnrollment: boolean;
  purchasable: boolean;
  unavailableReason?: string | null;
}

export interface CourseDetailPackage {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  deliveryMode: "SELF_STUDY" | "GROUP_CLASS" | "ONE_ON_ONE" | "COMBO";
  price: number;
  originalPrice?: number | null;
  durationDays?: number | null;
  includedTutorSessions?: number | null;
  maxGroupSize?: number | null;
  classDetail?: CourseClassDetail | null;
  owned: boolean;
  purchasable: boolean;
  unavailableReason?: string | null;
}

export interface CourseDetailResponse {
  id: string;
  code: string;
  name: string;
  link: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  learningObjectives?: string | null;
  prerequisites?: string | null;
  level?: string | null;
  status: string;
  category?: { id: string; name: string } | null;
  creator?: {
    id: string;
    code?: string | null;
    fullName?: string | null;
    avatarUrl?: string | null;
    title?: string | null;
    bio?: string | null;
  } | null;
  curriculum: {
    courseId: string;
    courseName: string;
    totalLessons: number;
    totalDurationMin: number;
    sections: CourseDetailSection[];
  };
  packages: CourseDetailPackage[];
  enrollment: {
    enrollmentId?: string | null;
    authenticated: boolean;
    hasCourseAccess: boolean;
    ownedPackageIds: string[];
    purchasablePackageIds: string[];
  };
}

export const courseApi = {
  /** Lấy response tổng hợp duy nhất cho trang chi tiết khóa học. */
  getCourseDetail: async (id: string): Promise<CourseDetailResponse> => {
    const response = await httpClient.get<ApiResponse<CourseDetailResponse>>(`/v1/courses/${id}/detail`);
    return response.data.data;
  },
  /** Lấy chi tiết lớp nhóm theo package khi người dùng chủ động mở phần xem lớp. */
  getCoursePackageClassDetail: async (packageId: string): Promise<CourseClassDetail> => {
    const response = await httpClient.get<ApiResponse<CourseClassDetail>>(
      `/v1/course-packages/${packageId}/class-detail`,
    );
    return response.data.data;
  },
  /** Lấy các chỉ số tổng quan thực tế của khóa học. */
  getCourseMetrics: (id: string) =>
    httpClient.get<ApiResponse<CourseMetrics>>(`/v1/courses/${id}/metrics`),
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
    httpClient.get<ApiResponse<number | string>>("/v1/courses/active-count"),

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
