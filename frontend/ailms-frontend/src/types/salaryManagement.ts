export type SalaryStatusEnum = "DRAFT" | "PENDING" | "CONFIRMED" | "TRANSFER_EXPORTED" | "PAID" | "REJECTED" | "CANCELLED";
export type SalaryTypeEnum = "HOURLY" | "DAILY" | "MONTHLY";

export interface SalaryDetailResponse {
  id: string;
  itemKey: string;
  amount: number;
  description?: string;
}

export interface SalaryResponse {
  id: string;
  employeeId: string;
  employeeName?: string;
  employeeCode?: string;
  departmentName?: string;
  avatarUrl?: string;
  period: string; // YYYY-MM
  baseSalary: number;
  bonus: number;
  deduction: number;
  totalSalary: number;
  salaryTypeEnum?: SalaryTypeEnum;
  status: SalaryStatusEnum;
  paidAt?: string;
  description?: string;
  details?: SalaryDetailResponse[];
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface SalaryTrendPoint {
  period: string; // YYYY-MM
  periodLabel: string; // MM/YYYY
  totalSalary: number;
}

export interface SalarySummaryResponse {
  period: string;
  totalSalaryPaid: number;
  totalSlips: number;
  draftCount: number;
  pendingCount: number;
  confirmedCount: number;
  transferExportedCount: number;
  paidCount: number;
  statusDistribution: Record<string, number>;
  salaryByDepartment: Record<string, number>;
  historicalTrend: SalaryTrendPoint[];
}

export interface SalarySearchFilters {
  keyword?: string;
  period?: string; // YYYY-MM
  periodFrom?: string;
  periodTo?: string;
  status?: SalaryStatusEnum | "ALL";
  departmentId?: string | "ALL";
  salaryTypeEnum?: SalaryTypeEnum | "ALL";
  page?: number;
  size?: number;
  sortBy?: string;
  sortDir?: "ASC" | "DESC";
}

export interface GenerateSalaryPeriodPayload {
  period: string; // YYYY-MM
  overwriteExisting?: boolean;
}

export interface PayrollBatchResponse {
  id: string;
  period: string;
  status: SalaryStatusEnum;
  slipCount: number;
  draftCount: number;
  pendingCount: number;
  confirmedCount: number;
  paidCount: number;
  totalAmount: number;
  rejectionReason?: string;
  submittedAt?: string;
  approvedAt?: string;
  createdBy?: string;
}
