import httpClient from "@/api/httpClient";
import type { ApiResponse, PageResponse } from "@/types/base";

export interface QuizSearchRequest {
  keyword?: string;
  courseId?: string | number;
  lessonId?: string | number;
  sectionId?: string | number;
  status?: string;
  page?: number;
  size?: number;
  sort?: string[] | string;
}

export interface QuizQuestionOption {
  id?: string | number;
  content: string;
  isCorrect: boolean;
  orderIndex?: number;
}

export interface QuizQuestionItem {
  id?: string | number;
  content: string;
  questionType: "MULTIPLE_CHOICE" | "SINGLE_CHOICE" | "TRUE_FALSE" | "SHORT_ANSWER" | "ESSAY" | "MATCHING";
  points?: number;
  options: QuizQuestionOption[];
  explanation?: string;
}

export interface QuizResponseItem {
  id: string | number;
  lessonId?: string | number;
  courseId?: string | number;
  sectionId?: string | number;
  code?: string;
  title: string;
  description?: string;
  timeLimitMin?: number;
  passScore?: number;
  maxAttempts?: number;
  shuffleQuestions?: boolean;
  status?: string;
  questions?: QuizQuestionItem[] | any;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const quizApi = {
  searchQuizzes: (params?: QuizSearchRequest) =>
    httpClient.get<ApiResponse<PageResponse<QuizResponseItem>>>("/v1/quizzes/search", { params }),

  getAllQuizzes: () =>
    httpClient.get<ApiResponse<QuizResponseItem[]>>("/v1/quizzes"),

  getQuizById: (id: string | number) =>
    httpClient.get<ApiResponse<QuizResponseItem>>(`/v1/quizzes/${id}`),

  createQuiz: (data: any) =>
    httpClient.post<ApiResponse<QuizResponseItem>>("/v1/quizzes", data),

  updateQuiz: (id: string | number, data: any) =>
    httpClient.put<ApiResponse<QuizResponseItem>>(`/v1/quizzes/${id}`, data),

  deleteQuiz: (id: string | number) =>
    httpClient.delete<ApiResponse<void>>(`/v1/quizzes/${id}`),

  /** Tìm kiếm quiz do chính Teacher/TA đang đăng nhập tạo. */
  searchAuthoredQuizzes: (params?: QuizSearchRequest) =>
    httpClient.get<ApiResponse<PageResponse<QuizResponseItem>>>("/v1/teacher/assessment-library/quizzes/search", { params }),

  /** Lấy quiz chi tiết kèm câu hỏi nếu thuộc người tạo hiện tại. */
  getAuthoredQuizById: (id: string | number) =>
    httpClient.get<ApiResponse<QuizResponseItem>>(`/v1/teacher/assessment-library/quizzes/${id}`),

  /** Tạo quiz trong thư viện cá nhân của Teacher/TA. */
  createAuthoredQuiz: (data: any) =>
    httpClient.post<ApiResponse<QuizResponseItem>>("/v1/teacher/assessment-library/quizzes", data),

  /** Sửa quiz thuộc quyền sở hữu của Teacher/TA. */
  updateAuthoredQuiz: (id: string | number, data: any) =>
    httpClient.put<ApiResponse<QuizResponseItem>>(`/v1/teacher/assessment-library/quizzes/${id}`, data),

  /** Xóa quiz thuộc quyền sở hữu của Teacher/TA. */
  deleteAuthoredQuiz: (id: string | number) =>
    httpClient.delete<ApiResponse<void>>(`/v1/teacher/assessment-library/quizzes/${id}`),
};
