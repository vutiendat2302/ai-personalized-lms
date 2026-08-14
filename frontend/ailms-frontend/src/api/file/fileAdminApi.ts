import httpClient from "@/api/httpClient";
import type { ApiResponse } from "@/types/base";
import type { PageResponse } from "@/types/admin";
import type {
  FileMetadataResponse,
  FileManagementSummaryResponse,
  FileSearchFilters,
  BulkFileActionRequest,
  FileUsageTypeEnum,
} from "@/types/fileManagement";

export const fileAdminApi = {
  // Lấy danh sách file có filter & phân trang cho Admin
  getFiles: async (filters: FileSearchFilters) => {
    const params: Record<string, any> = {};
    if (filters.keyword) params.keyword = filters.keyword;
    if (filters.fileType && filters.fileType !== "ALL") params.fileType = filters.fileType;
    if (filters.usageType && filters.usageType !== "ALL") params.usageType = filters.usageType;
    if (filters.status && filters.status !== "ALL") params.status = filters.status;
    if (filters.isOrphaned !== undefined && filters.isOrphaned !== "ALL") params.isOrphaned = filters.isOrphaned;
    if (filters.minSize) params.minSize = filters.minSize;
    if (filters.maxSize) params.maxSize = filters.maxSize;
    if (filters.startDate) {
      params.startDate = filters.startDate.includes("T") ? filters.startDate : `${filters.startDate}T00:00:00`;
    }
    if (filters.endDate) {
      params.endDate = filters.endDate.includes("T") ? filters.endDate : `${filters.endDate}T23:59:59`;
    }
    if (filters.page !== undefined) params.page = filters.page;
    if (filters.size !== undefined) params.size = filters.size;
    if (filters.sortBy) params.sort = `${filters.sortBy}:${(filters.sortDir || "DESC").toLowerCase()}`;

    const res = await httpClient.get<ApiResponse<PageResponse<FileMetadataResponse>>>(
      "/v1/files/admin",
      { params }
    );
    return res.data.data;
  },

  // Lấy dữ liệu tổng quan cho metric cards và charts
  getSummary: async () => {
    const res = await httpClient.get<ApiResponse<FileManagementSummaryResponse>>(
      "/v1/files/admin/summary"
    );
    return res.data.data;
  },

  // Lấy chi tiết 1 file
  getFileDetail: async (id: string | number) => {
    const res = await httpClient.get<ApiResponse<FileMetadataResponse>>(
      `/v1/files/admin/${id}`
    );
    return res.data.data;
  },

  // Lấy presigned URL tải file
  getDownloadUrl: async (id: string | number) => {
    const res = await httpClient.get<ApiResponse<string>>(
      `/v1/files/admin/${id}/download-url`
    );
    return res.data.data;
  },

  // Lấy URL xem trực tiếp (inline preview)
  getPreviewUrl: async (fileKey: string) => {
    const res = await httpClient.get<ApiResponse<string>>(
      "/v1/files/preview",
      { params: { fileKey } }
    );
    return res.data.data;
  },

  // Archive hàng loạt
  bulkArchive: async (request: BulkFileActionRequest) => {
    const res = await httpClient.post<ApiResponse<void>>(
      "/v1/files/admin/bulk-archive",
      request
    );
    return res.data;
  },

  // Soft delete hàng loạt (file mồ côi)
  bulkDelete: async (request: BulkFileActionRequest) => {
    const res = await httpClient.post<ApiResponse<void>>(
      "/v1/files/admin/bulk-delete",
      request
    );
    return res.data;
  },

  // Purge vĩnh viễn
  bulkPurge: async (request: BulkFileActionRequest) => {
    const res = await httpClient.post<ApiResponse<void>>(
      "/v1/files/admin/bulk-purge",
      request
    );
    return res.data;
  },

  // Quét thủ công file mồ côi
  rescanOrphaned: async () => {
    const res = await httpClient.post<ApiResponse<number>>(
      "/v1/files/admin/rescan-orphaned"
    );
    return res.data.data;
  },

  // Xuất báo cáo CSV
  exportCsv: async (filters: FileSearchFilters) => {
    const params: Record<string, any> = {};
    if (filters.keyword) params.keyword = filters.keyword;
    if (filters.fileType && filters.fileType !== "ALL") params.fileType = filters.fileType;
    if (filters.usageType && filters.usageType !== "ALL") params.usageType = filters.usageType;
    if (filters.status && filters.status !== "ALL") params.status = filters.status;
    if (filters.isOrphaned !== undefined && filters.isOrphaned !== "ALL") params.isOrphaned = filters.isOrphaned;
    if (filters.startDate) {
      params.startDate = filters.startDate.includes("T") ? filters.startDate : `${filters.startDate}T00:00:00`;
    }
    if (filters.endDate) {
      params.endDate = filters.endDate.includes("T") ? filters.endDate : `${filters.endDate}T23:59:59`;
    }

    const res = await httpClient.get("/v1/files/admin/export", {
      params,
      responseType: "blob",
    });
    return res.data;
  },

  // Chỉnh sửa tên hiển thị và module của metadata file
  updateFileMetadata: async (id: string, originalName: string, usageType: FileUsageTypeEnum) => {
    const res = await httpClient.patch<ApiResponse<FileMetadataResponse>>(
      `/v1/files/admin/${id}`,
      { originalName, usageType }
    );
    return res.data.data;
  },

  // Upload file mới trực tiếp lên MinIO và lưu metadata
  uploadFile: async (file: File, fileType?: string, usageType?: string, originalName?: string) => {
    const formData = new FormData();
    formData.append("file", file);
    if (fileType && fileType !== "AUTO") formData.append("fileType", fileType);
    if (usageType && usageType !== "AUTO") formData.append("usageType", usageType);
    if (originalName?.trim()) formData.append("originalName", originalName.trim());

    const res = await httpClient.post<ApiResponse<FileMetadataResponse>>(
      "/v1/files/upload",
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      }
    );
    return res.data.data;
  },
};
