import httpClient from "@/api/httpClient";
import type { ApiResponse } from "@/types/base";

export interface QuizResponseDTO {
  id: string;
  lessonId?: string | null;
  courseId?: string | null;
  sectionId?: string | null;
  code?: string;
  title: string;
  description?: string;
  timeLimitMin?: number;
  passScore?: number;
  maxAttempts?: number;
  shuffleQuestions?: boolean;
  status?: number;
  questions?: any[];
}

export interface AssignmentResponseDTO {
  id: string;
  lessonId?: string | null;
  courseId?: string | null;
  sectionId?: string | null;
  title: string;
  description?: string;
  maxScore?: number;
  dueDate?: string;
  allowLate?: boolean;
  status?: string;
}

export interface ResourceResponseDTO {
  id: string;
  lessonId?: string;
  name: string;
  fileMetadataId?: string;
  fileUrl?: string;
}

export interface LessonCurriculumItem {
  id: string;
  name: string;
  contentType: string;
  contentUrl?: string;
  description?: string;
  durationMin?: number;
  orderIndex: number;
  previewType?: string;
  status?: string;
  linkedQuiz?: QuizResponseDTO | null;
  linkedAssignment?: AssignmentResponseDTO | null;
  resources?: ResourceResponseDTO[];
  completed?: boolean;
  progressPercent?: number;
  lastPositionSec?: number;
}

export interface SectionCurriculumItem {
  id: string;
  name: string;
  orderIndex: number;
  status?: string;
  chapterQuizzes?: QuizResponseDTO[];
  chapterAssignments?: AssignmentResponseDTO[];
  lessons?: LessonCurriculumItem[];
}

export interface CourseCurriculumResponse {
  courseId: string;
  courseName: string;
  status?: string;
  sections?: SectionCurriculumItem[];
  finalExamQuizzes?: QuizResponseDTO[];
  finalExamAssignments?: AssignmentResponseDTO[];
  totalLessons?: number;
  totalDurationMin?: number;
}

export interface SubmissionResponseDTO {
  id: string;
  assignmentId: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  enrollmentId?: string;
  content?: string;
  fileUrl?: string;
  score?: number;
  feedback?: string;
  status?: number;
  submittedAt?: string;
  gradedAt?: string;
}

export const courseAuthoringApi = {
  getCurriculum: async (courseId: string): Promise<CourseCurriculumResponse> => {
    const res = await httpClient.get<ApiResponse<CourseCurriculumResponse>>(`/v1/authoring/courses/${courseId}/curriculum`);
    return res.data.data;
  },

  addSection: async (courseId: string, name: string) => {
    const res = await httpClient.post<ApiResponse<any>>(`/v1/authoring/courses/${courseId}/sections`, {
      name,
      courseId: Number(courseId)
    });
    return res.data.data;
  },

  updateSection: async (sectionId: string, name: string, status?: string, courseId?: string) => {
    const res = await httpClient.put<ApiResponse<any>>(`/v1/authoring/sections/${sectionId}`, {
      name,
      status: status || "ACTIVE",
      courseId: courseId ? Number(courseId) : 1
    });
    return res.data.data;
  },

  deleteSection: async (sectionId: string) => {
    const res = await httpClient.delete(`/v1/authoring/sections/${sectionId}`);
    return res.data;
  },

  reorderSections: async (courseId: string, ids: string[]) => {
    const res = await httpClient.patch(`/v1/authoring/courses/${courseId}/sections/reorder`, { ids });
    return res.data;
  },

  addLesson: async (sectionId: string, data: any) => {
    const res = await httpClient.post<ApiResponse<any>>(`/v1/authoring/sections/${sectionId}/lessons`, data);
    return res.data.data;
  },

  updateLesson: async (lessonId: string, data: any) => {
    const res = await httpClient.put<ApiResponse<any>>(`/v1/authoring/lessons/${lessonId}`, data);
    return res.data.data;
  },

  deleteLesson: async (lessonId: string) => {
    const res = await httpClient.delete(`/v1/authoring/lessons/${lessonId}`);
    return res.data;
  },

  reorderLessons: async (sectionId: string, ids: string[], targetSectionId?: string) => {
    const res = await httpClient.patch(`/v1/authoring/sections/${sectionId}/lessons/reorder`, { ids, targetSectionId });
    return res.data;
  },

  createQuiz: async (data: any) => {
    const res = await httpClient.post<ApiResponse<any>>("/v1/authoring/quizzes", data);
    return res.data.data;
  },

  updateQuiz: async (quizId: string, data: any) => {
    const res = await httpClient.put<ApiResponse<any>>(`/v1/authoring/quizzes/${quizId}`, data);
    return res.data.data;
  },

  createAssignment: async (data: any) => {
    const res = await httpClient.post<ApiResponse<any>>("/v1/authoring/assignments", data);
    return res.data.data;
  },

  updateAssignment: async (assignmentId: string, data: any) => {
    const res = await httpClient.put<ApiResponse<any>>(`/v1/authoring/assignments/${assignmentId}`, data);
    return res.data.data;
  },

  submitForReview: async (courseId: string) => {
    const res = await httpClient.post<ApiResponse<any>>(`/v1/authoring/courses/${courseId}/submit`);
    return res.data.data;
  },

  getSubmissions: async (assignmentId: string): Promise<SubmissionResponseDTO[]> => {
    const res = await httpClient.get<ApiResponse<SubmissionResponseDTO[]>>(`/v1/authoring/assignments/${assignmentId}/submissions`);
    return res.data.data;
  },

  gradeSubmission: async (submissionId: string, data: { score: number; feedback?: string; returnForResubmission?: boolean }) => {
    const res = await httpClient.put<ApiResponse<any>>(`/v1/authoring/submissions/${submissionId}/grade`, data);
    return res.data.data;
  },

  addLessonResource: async (lessonId: string, fileMetadataId: string, name: string) => {
    const res = await httpClient.post<ApiResponse<ResourceResponseDTO>>(`/v1/lesson-resources/lessons/${lessonId}/resources`, {
      lessonId: String(lessonId),
      fileMetadataId: String(fileMetadataId),
      name: name || "Tài liệu tham khảo"
    });
    return res.data.data;
  },

  deleteLessonResource: async (resourceId: string) => {
    const res = await httpClient.delete<ApiResponse<any>>(`/v1/lesson-resources/resources/${resourceId}`);
    return res.data;
  },
};
