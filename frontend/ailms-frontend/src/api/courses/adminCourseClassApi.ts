import httpClient from "@/api/httpClient";
import type { ApiResponse } from "@/types/base";

export const adminCourseClassApi = {
  getCourses: async () => (await httpClient.get<ApiResponse<any[]>>("/v1/courses")).data.data || [],
  searchCourses: async (params?: { keyword?: string; status?: string; page?: number; size?: number }) =>
    (await httpClient.get<ApiResponse<any>>("/v1/courses/search", { params })).data.data,
  getCourse: async (id: string) => (await httpClient.get<ApiResponse<any>>(`/v1/courses/${id}`)).data.data,
  getCategories: async () => (await httpClient.get<ApiResponse<any[]>>("/v1/categories")).data.data || [],
  getPackages: async () => (await httpClient.get<ApiResponse<any[]>>("/v1/course-packages")).data.data || [],
  getPackagesByCourse: async (courseId: string) => (await httpClient.get<ApiResponse<any[]>>(`/v1/course-packages/course/${courseId}`)).data.data || [],
  createPackage: async (payload: any) => (await httpClient.post<ApiResponse<any>>("/v1/course-packages", payload)).data.data,
  updatePackage: async (id: string, payload: any) => (await httpClient.put<ApiResponse<any>>(`/v1/course-packages/${id}`, payload)).data.data,
  deletePackage: async (id: string) => httpClient.delete(`/v1/course-packages/${id}`),
  getClasses: async () => (await httpClient.get<ApiResponse<any[]>>("/v1/classes")).data.data || [],
  getClass: async (id: string) => (await httpClient.get<ApiResponse<any>>(`/v1/classes/${id}`)).data.data,
  getClassesByCourse: async (courseId: string) => (await httpClient.get<ApiResponse<any[]>>(`/v1/classes/course/${courseId}`)).data.data || [],
  createClass: async (payload: any) => (await httpClient.post<ApiResponse<any>>("/v1/classes", payload)).data.data,
  createGroupClass: async (payload: any) => (await httpClient.post<ApiResponse<any>>("/v1/class_managements/classes", payload)).data.data,
  updateClass: async (id: string, payload: any) => (await httpClient.put<ApiResponse<any>>(`/v1/classes/${id}`, payload)).data.data,
  deleteClass: async (id: string) => httpClient.delete(`/v1/classes/${id}`),
  getClassSessions: async (classId: string) => (await httpClient.get<ApiResponse<any[]>>(`/v1/class-online/class/${classId}`)).data.data || [],
  getClassMembers: async (classId: string) => (await httpClient.get<ApiResponse<any[]>>(`/v1/classes/${classId}/members`)).data.data || [],
  getClassSchedules: async (classId: string) => (await httpClient.get<ApiResponse<any[]>>(`/v1/classes/${classId}/schedules`)).data.data || [],
  updateClassSchedules: async (classId: string, schedules: any[]) => (await httpClient.put<ApiResponse<any[]>>(`/v1/classes/${classId}/schedules`, schedules)).data.data || [],
  getCourseTeachers: async (courseId: string) => (await httpClient.get<ApiResponse<any[]>>(`/v1/course-teachers/course/${courseId}`)).data.data || [],
  getAllCourseTeachers: async () => (await httpClient.get<ApiResponse<any[]>>("/v1/course-teachers")).data.data || [],
  getClassEnrollments: async (classId: string) => (await httpClient.get<ApiResponse<any[]>>(`/v1/enrollments/class/${classId}`)).data.data || [],
  getTeachingRates: async () => (await httpClient.get<ApiResponse<any[]>>("/v1/teaching-rates")).data.data || [],
  getTeachingPayments: async () => (await httpClient.get<ApiResponse<any[]>>("/v1/teaching-session-payments")).data.data || [],
  getEmployees: async () => (await httpClient.get<ApiResponse<any[]>>("/v1/employees")).data.data || [],
  getTeacherCategories: async () => (await httpClient.get<ApiResponse<any[]>>("/v1/teacher_categories/teacher-categories")).data.data || [],
  getSections: async (courseId: string) => (await httpClient.get<ApiResponse<any[]>>(`/v1/courses/${courseId}/sections`)).data.data || [],
  getLessons: async (sectionId: string) => (await httpClient.get<ApiResponse<any[]>>(`/v1/lessons/sections/${sectionId}`)).data.data || [],
  getLesson: async (lessonId: string) => (await httpClient.get<ApiResponse<any>>(`/v1/lessons/${lessonId}`)).data.data,
  getLessonResources: async (lessonId: string) => (await httpClient.get<ApiResponse<any[]>>(`/v1/lesson-resources/lessons/${lessonId}/resources`)).data.data || [],
  assignCourseTeacher: async (courseId: string, userId: string) =>
    (await httpClient.post<ApiResponse<any>>("/v1/course-teachers", { courseId, userId })).data.data,
  updateCourseTeacherStatus: async (courseId: string, userId: string, status: string) =>
    (await httpClient.patch<ApiResponse<any>>(`/v1/course-teachers/${courseId}/${userId}/status`, { status })).data.data,
  removeCourseTeacher: async (courseId: string, userId: string) =>
    httpClient.delete(`/v1/course-teachers/${courseId}/${userId}`),

  // Stream Posts API
  getStreamPosts: async (classId: string, page = 0, size = 10) =>
    (await httpClient.get<ApiResponse<any>>(`/v1/classes/${classId}/stream-posts`, { params: { page, size } })).data.data,
  createStreamPost: async (classId: string, payload: any) =>
    (await httpClient.post<ApiResponse<any>>(`/v1/classes/${classId}/stream-posts`, payload)).data.data,
  deleteStreamPost: async (classId: string, postId: string) =>
    httpClient.delete(`/v1/classes/${classId}/stream-posts/${postId}`),

  // Class Resources API
  getClassResources: async (classId: string, params?: { keyword?: string; page?: number; size?: number }) =>
    (await httpClient.get<ApiResponse<any>>(`/v1/classes/${classId}/resources`, { params })).data.data,
  createClassResource: async (classId: string, payload: any) =>
    (await httpClient.post<ApiResponse<any>>(`/v1/classes/${classId}/resources`, payload)).data.data,
  deleteClassResource: async (classId: string, resourceId: string) =>
    httpClient.delete(`/v1/classes/${classId}/resources/${resourceId}`),

  // Member Detail & Paged API
  getMemberDetail: async (classId: string, userId: string) =>
    (await httpClient.get<ApiResponse<any>>(`/v1/classes/${classId}/members/${userId}/detail`)).data.data,
  getClassMembersPage: async (classId: string, params?: { keyword?: string; role?: string; status?: string; page?: number; size?: number }) =>
    (await httpClient.get<ApiResponse<any>>(`/v1/classes/${classId}/members/page`, { params })).data.data,

  // Sessions Paged API
  getClassSessionsPage: async (classId: string, params?: { keyword?: string; status?: string; page?: number; size?: number; sortDirection?: string }) =>
    (await httpClient.get<ApiResponse<any>>(`/v1/class-online/class/${classId}/page`, { params })).data.data,
};
