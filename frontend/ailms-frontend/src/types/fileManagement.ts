export type FileTypeEnum = "IMAGE" | "DOCUMENT" | "VIDEO" | "AUDIO" | "OTHER";

export type FileUsageTypeEnum = 
  | "AVATAR"
  | "CONTRACT"
  | "QUIZ_ATTACHMENT"
  | "ASSIGNMENT"
  | "ASSIGNMENT_SUBMISSION"
  | "LESSON_RESOURCE"
  | "LESSON_VIDEO"
  | "COURSE_LESSON"
  | "POLICY"
  | "OTHER";

export type BaseStatusEnum = "ACTIVE" | "INACTIVE" | "ARCHIVED" | "DELETED";

export interface FileMetadataResponse {
  id: string;
  fileKey: string;
  originalName: string;
  fileSize: number;
  contentType: string;
  fileType: FileTypeEnum;
  usageType?: FileUsageTypeEnum;
  referenceEntityId?: string;
  referenceEntityType?: string;
  status: BaseStatusEnum;
  orphaned: boolean;
  orphanedDetectedAt?: string;
  createdBy?: string;
  createdByName?: string;
  createdByCode?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface MonthlyUploadTrend {
  month: string;
  count: number;
  sizeBytes: number;
}

export interface FileManagementSummaryResponse {
  totalFiles: number;
  totalSizeBytes: number;
  orphanedFilesCount: number;
  uploadedThisMonth: number;
  archivedOrDeletedCount: number;
  activeFiles?: number;
  deletedFiles?: number;
  sizeByUsageType: Partial<Record<FileUsageTypeEnum, number>>;
  sizeByFileType: Partial<Record<FileTypeEnum, number>>;
  uploadTrend: MonthlyUploadTrend[];
}

export interface FileSearchFilters {
  keyword?: string;
  fileType?: FileTypeEnum | "ALL";
  usageType?: FileUsageTypeEnum | "ALL";
  status?: BaseStatusEnum | "ALL";
  isOrphaned?: boolean | "ALL";
  minSize?: number;
  maxSize?: number;
  startDate?: string;
  endDate?: string;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDir?: "ASC" | "DESC";
}

export interface BulkFileActionRequest {
  fileIds: string[];
  reason?: string;
}
