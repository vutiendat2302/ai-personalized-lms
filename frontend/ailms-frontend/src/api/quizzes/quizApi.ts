import httpClient from "@/api/httpClient";
import type { ApiResponse, PageResponse } from "@/types/base";

export interface QuizSearchRequest {
  keyword?: string;
  courseId?: string | number;
  lessonId?: string | number;
  sectionId?: string | number;
  status?: number;
  page?: number;
  size?: number;
  sort?: string[] | string;
}

export interface QuizQuestionOption {
  id?: string | number;
  optionText: string;
  isCorrect: boolean;
  explanation?: string;
}

export interface QuizQuestionItem {
  id?: string | number;
  questionText: string;
  questionType?: "MULTIPLE_CHOICE" | "SINGLE_CHOICE" | "TRUE_FALSE" | "FILL_BLANK" | "ESSAY";
  points?: number;
  options?: QuizQuestionOption[];
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
  status?: number;
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
};
