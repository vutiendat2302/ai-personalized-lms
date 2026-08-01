import httpClient from "@/api/httpClient";
import type { ApiResponse, PageResponse } from "@/types/base";
import type {
  AttendanceResponse,
  AttendanceSummaryResponse,
  AttendanceSearchFilters,
  SimulateAttendanceRequest,
  UpdateAttendanceRequest,
} from "@/types/attendanceManagement";

export const attendanceAdminApi = {
  // Lấy danh sách phân trang có bộ lọc
  getAttendances: async (filters: AttendanceSearchFilters) => {
    const params: Record<string, any> = {};
    if (filters.keyword) params.keyword = filters.keyword;
    if (filters.workDateFrom) params.workDateFrom = filters.workDateFrom;
    if (filters.workDateTo) params.workDateTo = filters.workDateTo;
    if (filters.status && filters.status !== "ALL") params.status = filters.status;
    if (filters.source && filters.source !== "ALL") params.source = filters.source;
    if (filters.departmentId && filters.departmentId !== "ALL") params.departmentId = filters.departmentId;
    if (filters.workShiftId && filters.workShiftId !== "ALL") params.workShiftId = filters.workShiftId;
    if (filters.page !== undefined) params.page = filters.page;
    if (filters.size !== undefined) params.size = filters.size;
    if (filters.sortBy) params.sort = `${filters.sortBy}:${(filters.sortDir || "DESC").toLowerCase()}`;

    const res = await httpClient.get<ApiResponse<PageResponse<AttendanceResponse>>>(
      "/v1/attendances",
      { params }
    );
    return res.data.data;
  },

  // Lấy tổng quan mét thống kê & biểu đồ
  getSummary: async (params?: { fromDate?: string; toDate?: string; departmentId?: string | number }) => {
    const res = await httpClient.get<ApiResponse<AttendanceSummaryResponse>>(
      "/v1/attendances/summary",
      { params }
    );
    return res.data.data;
  },

  // Lấy chi tiết bản ghi
  getById: async (id: string | number) => {
    const res = await httpClient.get<ApiResponse<AttendanceResponse>>(
      `/v1/attendances/${id}`
    );
    return res.data.data;
  },

  // Chỉnh sửa tay HR (bắt buộc có note)
  patchUpdate: async (id: string | number, data: UpdateAttendanceRequest) => {
    const res = await httpClient.patch<ApiResponse<AttendanceResponse>>(
      `/v1/attendances/${id}`,
      data
    );
    return res.data.data;
  },

  // Phê duyệt 1 bản ghi
  approve: async (id: string | number) => {
    const res = await httpClient.patch<ApiResponse<AttendanceResponse>>(
      `/v1/attendances/${id}/approve`
    );
    return res.data.data;
  },

  bulkApprove: async (ids: (string | number)[]) => {
    const res = await httpClient.post<ApiResponse<void>>(
      "/v1/attendances/bulk-approve",
      ids
    );
    return res.data;
  },

  // Trigger sinh dữ liệu giả lập (Demo/Dev)
  simulate: async (request: SimulateAttendanceRequest) => {
    const res = await httpClient.post<ApiResponse<number>>(
      "/v1/attendances/admin/simulate",
      request
    );
    return res.data.data;
  },

  // Xuất báo cáo CSV
  exportCsv: async (filters: AttendanceSearchFilters) => {
    const params: Record<string, any> = {};
    if (filters.keyword) params.keyword = filters.keyword;
    if (filters.workDateFrom) params.workDateFrom = filters.workDateFrom;
    if (filters.workDateTo) params.workDateTo = filters.workDateTo;
    if (filters.status && filters.status !== "ALL") params.status = filters.status;
    if (filters.source && filters.source !== "ALL") params.source = filters.source;
    if (filters.departmentId && filters.departmentId !== "ALL") params.departmentId = filters.departmentId;

    const res = await httpClient.get("/v1/attendances/export", {
      params,
      responseType: "blob",
    });
    return res.data;
  },
};
