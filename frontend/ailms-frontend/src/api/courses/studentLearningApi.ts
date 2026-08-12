import httpClient from "@/api/httpClient";
import type { ApiResponse } from "@/types/base";
import type { CourseCurriculumResponse } from "./courseAuthoringApi";

export interface UpdateProgressPayload {
  watchPercent?: number;
  lastPositionSec?: number;
  timeSpentSec?: number;
  markCompleted?: boolean;
}

export interface AccessibleLessonResponse {
  id: string;
  name: string;
  contentType: string;
  contentUrl?: string | null;
  description?: string | null;
  durationMin?: number | null;
  previewType?: string | null;
  locked: boolean;
}

export const studentLearningApi = {
  /** Lấy toàn bộ cây nội dung và quyền mở từng bài do backend tính. */
  getEnrolledCourseTree: async (courseId: string): Promise<CourseCurriculumResponse> => {
    const res = await httpClient.get<ApiResponse<CourseCurriculumResponse>>(`/v1/learning/courses/${courseId}`);
    return res.data.data;
  },

  /** Lấy nội dung một bài sau khi backend xác minh enrollment hoặc preview. */
  getAccessibleLesson: async (lessonId: string): Promise<AccessibleLessonResponse> => {
    const res = await httpClient.get<ApiResponse<AccessibleLessonResponse>>(`/v1/learning/lessons/${lessonId}`);
    return res.data.data;
  },

  /** Ghi tiến độ cho enrollment của chính người dùng hiện tại. */
  updateProgress: async (lessonId: string, enrollmentId: string, payload: UpdateProgressPayload) => {
    const res = await httpClient.put<ApiResponse<unknown>>(`/v1/learning/lessons/${lessonId}/progress`, payload, {
      params: { enrollmentId },
    });
    return res.data.data;
  },

  /** Đánh dấu hoàn thành bài học của enrollment hiện tại. */
  completeLesson: async (lessonId: string, enrollmentId: string) => {
    const res = await httpClient.post<ApiResponse<unknown>>(`/v1/learning/lessons/${lessonId}/complete`, null, {
      params: { enrollmentId },
    });
    return res.data.data;
  },
};
