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
  availableFrom?: string;
  dueAt?: string;
  showResultAfterSubmit?: boolean;
  status?: string;
  questions?: QuizQuestionDTO[];
}

export type QuizQuestionType = "SINGLE_CHOICE" | "TRUE_FALSE" | "MULTIPLE_CHOICE" | "SHORT_ANSWER" | "ESSAY" | "MATCHING";

export interface QuizQuestionOptionDTO {
  id?: string;
  content: string;
  isCorrect?: boolean | null;
  orderIndex?: number;
}

export interface QuizQuestionDTO {
  id: string;
  content: string;
  questionType: QuizQuestionType;
  points: number;
  orderIndex?: number;
  explanation?: string;
  options: QuizQuestionOptionDTO[];
}

export interface QuizUpsertRequest {
  lessonId?: string | null;
  courseId?: string | null;
  sectionId?: string | null;
  title: string;
  description?: string;
  timeLimitMin?: number;
  passScore?: number;
  maxAttempts?: number;
  shuffleQuestions?: boolean;
  questions?: QuizQuestionDTO[];
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
  title?: string;
  contentType: string;
  contentUrl?: string;
  description?: string;
  durationMin?: number;
  durationSec?: number;
  duration?: number;
  orderIndex: number;
  previewType?: string;
  status?: string;
  linkedQuiz?: QuizResponseDTO | null;
  linkedAssignment?: AssignmentResponseDTO | null;
  resources?: ResourceResponseDTO[];
  completed?: boolean;
  progressPercent?: number;
  lastPositionSec?: number;
  personalNote?: string;
  preview?: boolean;
  accessible?: boolean;
  locked?: boolean;
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
  createdBy?: string;
  sections?: SectionCurriculumItem[];
  finalExamQuizzes?: QuizResponseDTO[];
  finalExamAssignments?: AssignmentResponseDTO[];
  totalLessons?: number;
  totalDurationMin?: number;
  enrollmentId?: string;
  staffPreviewAccess?: boolean;
  deliveryMode?: "SELF_STUDY" | "GROUP_CLASS" | "ONE_ON_ONE";
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
      courseId: courseId
    });
    return res.data.data;
  },

  updateSection: async (sectionId: string, name: string, status?: string, courseId?: string) => {
    const res = await httpClient.put<ApiResponse<any>>(`/v1/authoring/sections/${sectionId}`, {
      name,
      status: status || "ACTIVE",
      courseId: courseId || undefined
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

  createQuiz: async (data: QuizUpsertRequest) => {
    const res = await httpClient.post<ApiResponse<any>>("/v1/authoring/quizzes", data);
    return res.data.data;
  },

  updateQuiz: async (quizId: string, data: QuizUpsertRequest) => {
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

  cancelReview: async (courseId: string) => {
    const res = await httpClient.post<ApiResponse<any>>(`/v1/authoring/courses/${courseId}/cancel-review`);
    return res.data.data;
  },

  requestEdit: async (courseId: string) => {
    const res = await httpClient.post<ApiResponse<any>>(`/v1/authoring/courses/${courseId}/request-edit`);
    return res.data.data;
  },

  searchTeachers: async (query?: string) => {
    const res = await httpClient.get<ApiResponse<any[]>>(`/v1/authoring/teachers/search?query=${encodeURIComponent(query || "")}`);
    return res.data.data;
  },

  inviteInstructor: async (courseId: string, payload: { email?: string; instructorId?: string }) => {
    const res = await httpClient.post<ApiResponse<any>>(`/v1/authoring/courses/${courseId}/instructors/invite`, payload);
    return res.data.data;
  },

  getCourseInstructors: async (courseId: string) => {
    const res = await httpClient.get<ApiResponse<any[]>>(`/v1/authoring/courses/${courseId}/instructors`);
    return res.data.data;
  },

  removeInstructor: async (courseId: string, instructorId: string) => {
    const res = await httpClient.delete<ApiResponse<any>>(`/v1/authoring/courses/${courseId}/instructors/${instructorId}`);
    return res.data;
  },

  respondInvitation: async (invitationId: string, accept: boolean) => {
    const res = await httpClient.post<ApiResponse<any>>(`/v1/authoring/courses/instructors/invitations/${invitationId}/respond?accept=${accept}`);
    return res.data.data;
  },

  getMyInvitations: async () => {
    const res = await httpClient.get<ApiResponse<any[]>>("/v1/authoring/courses/instructors/my-invitations");
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
