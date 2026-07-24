import httpClient from "@/api/httpClient";
import type { ApiResponse } from "@/types/base";

export interface PopularSearchResponse {
  id: string;
  name: string;
  link: string;
  categoryName: string;
  avgRating?: number;
  suggestedPrice?: number;
}

export interface SearchHistoryResponse {
  id: string;
  keyword: string;
  courseId?: string | null;
  courseName?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface SuggestionResponse {
  id: string;
  name: string;
  link: string;
  categoryName: string;
  avgRating?: number;
  suggestedPrice?: number;
}

export const searchApi = {
  getSuggestions: (keyword: string) =>
    httpClient.get<ApiResponse<SuggestionResponse[]>>("/v1/search/suggestions", {
      params: { keyword },
    }),

  getSearchHistory: () =>
    httpClient.get<ApiResponse<SearchHistoryResponse[]>>("/v1/search/history"),

  getPopularSearches: (days: number = 5, limit: number = 5) =>
    httpClient.get<ApiResponse<PopularSearchResponse[]>>("/v1/search/popular", {
      params: { days, limit },
    }),

  saveSearchHistory: (payload: { keyword: string; courseId?: string | null }) =>
    httpClient.post<ApiResponse<SearchHistoryResponse>>("/v1/search/history", payload),

  deleteSearchHistory: (id: string | number) =>
    httpClient.delete<ApiResponse<void>>(`/v1/search/history/${id}`),
};
