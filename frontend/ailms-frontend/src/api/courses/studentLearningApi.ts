import httpClient from "@/api/httpClient";
import type { ApiResponse } from "@/types/base";
import type { CourseCurriculumResponse } from "./courseAuthoringApi";

export interface UpdateProgressPayload {
  watchPercent?: number;
  lastPositionSec?: number;
  timeSpentSec?: number;
  markCompleted?: boolean;
}

export const studentLearningApi = {
  getCourseTree: async (courseId: string, userId?: string): Promise<CourseCurriculumResponse> => {
    const res = await httpClient.get<ApiResponse<CourseCurriculumResponse>>(`/v1/learn/courses/${courseId}/tree`, {
      params: { userId },
    });
    return res.data.data;
  },

  updateProgress: async (lessonId: string, userId: string, enrollmentId: string, payload: UpdateProgressPayload) => {
    const res = await httpClient.put<ApiResponse<any>>(`/v1/learn/lessons/${lessonId}/progress`, payload, {
      params: { userId, enrollmentId },
    });
    return res.data.data;
  },

  completeLesson: async (lessonId: string, userId: string, enrollmentId: string) => {
    const res = await httpClient.post<ApiResponse<any>>(`/v1/learn/lessons/${lessonId}/complete`, null, {
      params: { userId, enrollmentId },
    });
    return res.data.data;
  },
};
