import httpClient from "@/api/httpClient";
import type { ApiResponse } from "@/types/base";

export type StreamPostType = "QUESTION" | "DISCUSSION" | "ANNOUNCEMENT";

export interface StreamPostComment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string | null;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface StreamPostItem {
  id: string;
  classId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string | null;
  type: StreamPostType;
  title?: string | null;
  content: string;
  pinned: boolean;
  commentLocked: boolean;
  createdAt: string;
  updatedAt: string;
  commentCount: number;
}

export interface ClassSessionUsage {
  classId: string;
  totalSessions: number | null;
  reviewedSessions: number;
  scheduledSessions: number;
  remainingSessions: number | null;
  packageLimitConfigured: boolean;
  classStatus: string;
}

export interface ScheduleClassSessionPayload {
  title?: string;
  meetingUrl?: string;
  meetingProvider?: string;
  scheduledAt: string;
  durationMin: number;
}

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
  getMyTeachingClasses: async () => (await httpClient.get<ApiResponse<any[]>>("/v1/classes/teaching/me")).data.data || [],
  getClass: async (id: string) => (await httpClient.get<ApiResponse<any>>(`/v1/classes/${id}`)).data.data,
  getClassesByCourse: async (courseId: string) => (await httpClient.get<ApiResponse<any[]>>(`/v1/classes/course/${courseId}`)).data.data || [],
  createClass: async (payload: any) => (await httpClient.post<ApiResponse<any>>("/v1/classes", payload)).data.data,
  createGroupClass: async (payload: any) => (await httpClient.post<ApiResponse<any>>("/v1/class_managements/classes", payload)).data.data,
  updateClass: async (id: string, payload: any) => (await httpClient.put<ApiResponse<any>>(`/v1/classes/${id}`, payload)).data.data,
  deleteClass: async (id: string) => httpClient.delete(`/v1/classes/${id}`),
  getClassSessions: async (classId: string) => (await httpClient.get<ApiResponse<any[]>>(`/v1/class-online/class/${classId}`)).data.data || [],
  /** Lấy quota buổi học, trong đó buổi đã dùng phải có nhận xét. */
  getClassSessionUsage: async (classId: string) =>
    (await httpClient.get<ApiResponse<ClassSessionUsage>>(`/v1/classes/${classId}/session-usage`)).data.data,
  /** Đặt một buổi học mới cho lớp bằng danh tính trong JWT. */
  scheduleClassSession: async (classId: string, payload: ScheduleClassSessionPayload) =>
    (await httpClient.post<ApiResponse<any>>(`/v1/classes/${classId}/sessions`, payload)).data.data,
  /** Hủy buổi học với lý do bắt buộc. */
  cancelClassSession: async (classId: string, sessionId: string, reason: string) =>
    (await httpClient.post<ApiResponse<any>>(`/v1/classes/${classId}/sessions/${sessionId}/cancel`, { reason })).data.data,
  getClassMembers: async (classId: string) => (await httpClient.get<ApiResponse<any[]>>(`/v1/classes/${classId}/members`)).data.data || [],
  /** Đổi giáo viên lớp atomically; backend kiểm tra trùng lịch và phát thông báo. */
  replaceClassTeacher: async (classId: string, newTeacherUserId: string, reason: string) =>
    (await httpClient.post<ApiResponse<any>>(`/v1/classes/${classId}/teacher/replace`, {
      newTeacherUserId,
      reason,
    })).data.data,
  getClassSchedules: async (classId: string) => (await httpClient.get<ApiResponse<any[]>>(`/v1/classes/${classId}/schedules`)).data.data || [],
  updateClassSchedules: async (classId: string, schedules: any[]) => (await httpClient.put<ApiResponse<any[]>>(`/v1/classes/${classId}/schedules`, schedules)).data.data || [],
  getCourseTeachers: async (courseId: string) => (await httpClient.get<ApiResponse<any[]>>(`/v1/course-teachers/course/${courseId}`)).data.data || [],
  getAllCourseTeachers: async () => (await httpClient.get<ApiResponse<any[]>>("/v1/course-teachers")).data.data || [],
  getClassEnrollments: async (classId: string) => (await httpClient.get<ApiResponse<any[]>>(`/v1/enrollments/class/${classId}`)).data.data || [],
  getTeachingRates: async () => (await httpClient.get<ApiResponse<any[]>>("/v1/teaching-rates")).data.data || [],
  getTeachingPayments: async () => (await httpClient.get<ApiResponse<any[]>>("/v1/teaching-session-payments")).data.data || [],
  getEmployees: async () => (await httpClient.get<ApiResponse<any[]>>("/v1/employees")).data.data || [],
  getTeacherCategories: async () => (await httpClient.get<ApiResponse<any[]>>("/v1/teacher_categories/teacher-categories")).data.data || [],
  getMyTeacherCategories: async () => (await httpClient.get<ApiResponse<any[]>>("/v1/teacher_categories/teacher-categories/me")).data.data || [],
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
  /** Sửa bài đăng trong lớp theo quyền backend. */
  updateStreamPost: async (classId: string, postId: string, payload: { title?: string; content: string }) =>
    (await httpClient.put<ApiResponse<StreamPostItem>>(`/v1/classes/${classId}/stream-posts/${postId}`, payload)).data.data,
  /** Ghim, khóa bình luận hoặc ẩn bài bằng quyền staff lớp. */
  moderateStreamPost: async (classId: string, postId: string, payload: { pinned?: boolean; commentLocked?: boolean; hidden?: boolean }) =>
    (await httpClient.patch<ApiResponse<StreamPostItem>>(`/v1/classes/${classId}/stream-posts/${postId}/moderation`, payload)).data.data,
  deleteStreamPost: async (classId: string, postId: string) =>
    httpClient.delete(`/v1/classes/${classId}/stream-posts/${postId}`),
  /** Lấy bình luận phân trang của bài. */
  getStreamComments: async (classId: string, postId: string, page = 0, size = 20) =>
    (await httpClient.get<ApiResponse<any>>(`/v1/classes/${classId}/stream-posts/${postId}/comments`, { params: { page, size } })).data.data,
  /** Đăng bình luận hoặc câu trả lời mới. */
  createStreamComment: async (classId: string, postId: string, content: string) =>
    (await httpClient.post<ApiResponse<StreamPostComment>>(`/v1/classes/${classId}/stream-posts/${postId}/comments`, { content })).data.data,
  /** Sửa bình luận của người dùng hiện tại. */
  updateStreamComment: async (classId: string, postId: string, commentId: string, content: string) =>
    (await httpClient.put<ApiResponse<StreamPostComment>>(`/v1/classes/${classId}/stream-posts/${postId}/comments/${commentId}`, { content })).data.data,
  /** Xóa bình luận theo quyền tác giả hoặc staff. */
  deleteStreamComment: async (classId: string, postId: string, commentId: string) =>
    httpClient.delete(`/v1/classes/${classId}/stream-posts/${postId}/comments/${commentId}`),

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
