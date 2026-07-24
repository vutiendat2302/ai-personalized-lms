import httpClient from "@/api/httpClient";
import type { ApiResponse } from "@/types/base";

export interface LessonResponse {
  id: string;
  courseId: string;
  sectionId?: string;
  sectionTitle?: string;
  title: string;
  description?: string;
  type: string; // VIDEO, DOCUMENT, QUIZ
  duration?: string;
  videoUrl?: string;
  documentUrl?: string;
  isFree?: boolean;
  isPreview?: boolean;
  freePreview?: boolean;
  orderNumber?: number;
  status?: string;
  createdAt?: string;
}

export interface SectionResponse {
  id: string;
  courseId: string;
  title: string;
  orderNumber?: number;
  lessons: LessonResponse[];
}

export const lessonApi = {
  getLessonsByCourse: (courseId: string) =>
    httpClient.get<ApiResponse<LessonResponse[] | any>>("/v1/lessons/search", {
      params: { courseId, size: 100 },
    }),

  getSectionsByCourse: (courseId: string) =>
    httpClient.get<ApiResponse<SectionResponse[]>>(`/v1/courses/${courseId}/sections`),
};
