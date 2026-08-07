import httpClient from "@/api/httpClient";
import type { ApiResponse } from "@/types/base";
import type {
  ClassOnlineResponse,
  CreateClassOnlinePayload,
  UpdateClassOnlinePayload,
  PageResponse,
} from "@/types/admin";

export interface ClassOnlineSearchParams {
  keyword?: string;
  classId?: string;
  status?: string;
  lifecycleStatus?: string;
  scheduledFrom?: string;
  scheduledTo?: string;
  createdFrom?: string;
  createdTo?: string;
  page?: number;
  size?: number;
  sort?: string[];
}

export const classSessionApi = {
  getAllSessions: async (): Promise<ClassOnlineResponse[]> => {
    const res = await httpClient.get<ApiResponse<ClassOnlineResponse[]>>("/v1/class-online");
    return res.data.data || [];
  },

  searchSessions: async (params?: ClassOnlineSearchParams): Promise<PageResponse<ClassOnlineResponse>> => {
    const res = await httpClient.get<ApiResponse<PageResponse<ClassOnlineResponse>>>("/v1/class-online/search", { params });
    return res.data.data;
  },

  getSessionById: async (id: string): Promise<ClassOnlineResponse> => {
    const res = await httpClient.get<ApiResponse<ClassOnlineResponse>>(`/v1/class-online/${id}`);
    return res.data.data;
  },

  getSessionsByClassId: async (classId: string): Promise<ClassOnlineResponse[]> => {
    const res = await httpClient.get<ApiResponse<ClassOnlineResponse[]>>(`/v1/class-online/class/${classId}`);
    return res.data.data || [];
  },

  createSession: async (payload: CreateClassOnlinePayload): Promise<ClassOnlineResponse> => {
    const res = await httpClient.post<ApiResponse<ClassOnlineResponse>>("/v1/class-online", payload);
    return res.data.data;
  },

  updateSession: async (id: string, payload: UpdateClassOnlinePayload): Promise<ClassOnlineResponse> => {
    const res = await httpClient.put<ApiResponse<ClassOnlineResponse>>(`/v1/class-online/${id}`, payload);
    return res.data.data;
  },

  deleteSession: async (id: string): Promise<void> => {
    await httpClient.delete(`/v1/class-online/${id}`);
  },

  bulkDeleteSessions: async (ids: string[]): Promise<void> => {
    await Promise.all(ids.map((id) => httpClient.delete(`/v1/class-online/${id}`)));
  },

  searchClasses: async (params?: { keyword?: string; page?: number; size?: number }): Promise<PageResponse<any>> => {
    const res = await httpClient.get<ApiResponse<PageResponse<any>>>("/v1/classes/search", { params });
    return res.data.data;
  },

  getClasses: async (params?: { keyword?: string; page?: number; size?: number }): Promise<PageResponse<any>> => {
    const res = await httpClient.get<ApiResponse<PageResponse<any>>>("/v1/classes/search", {
      params: { page: 0, size: 20, ...params },
    });
    return res.data.data;
  },

  getTeachers: async (): Promise<any[]> => {
    const res = await httpClient.get<ApiResponse<any[]>>("/v1/employees");
    return res.data.data || [];
  },
};
