export type EmploymentType = "FULL_TIME" | "PART_TIME";
export type EmployeeStatus = "ACTIVE" | "PROBATION" | "ON_LEAVE" | "TERMINATED" | "EXPIRED";
export type ContractType = "PROBATION" | "OFFICIAL" | "PART_TIME";
export type AttendanceStatus = "PRESENT" | "LATE" | "HALF_DAY" | "ABSENT" | "ON_LEAVE";
export type SalaryStatus = "DRAFT" | "APPROVED" | "PAID";
export type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED" | "UNPAID" | "CANCELLED";
export type TeachingRateStatus = "ACTIVE" | "INACTIVE";
export type TeachingSessionStatus = "Draft" | "Pending" | "CONFIRMED" | "PAID";

export interface EmployeeResponse {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  email?: string;
  fullName: string;
  employeeCode: string;
  avatarUrl?: string;
  phone?: string;
  gender?: number;
  dateOfBirth?: string;
  departmentId?: string;
  departmentName?: string;
  departmentCode?: string;
  position?: string;
  roles?: string[];
  employmentTypeEnum?: EmploymentType;
  startDate?: string;
  endDate?: string;
  status: EmployeeStatus;
  userStatus?: "ACTIVE" | "LOCKED" | "VERIFICATION" | "DELETED";
  createdAt?: string;
  updatedAt?: string;
}

export interface EmployeeExtended {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  email?: string;
  employeeCode: string;
  fullName: string;
  avatarUrl?: string;
  phone?: string;
  gender?: number; // 0 = Nam, 1 = Nữ, 2 = Khác
  dateOfBirth?: string;
  address?: string;
  departmentId?: string;
  departmentName?: string;
  position: string;
  roles?: string[];
  teacherCategories?: string[];
  employmentType: EmploymentType;
  status: EmployeeStatus;           // EmployeeStatusEnum (trạng thái nhân viên)
  userStatus?: "ACTIVE" | "LOCKED" | "VERIFICATION" | "DELETED"; // UserStatusEnum
  baseSalary?: number;
  joinedAt: string;
  startDate?: string;
  endDate?: string;
  probationEndDate?: string;
}

export interface EmployeeContractItem {
  id: string;
  employeeId: string;
  employeeCode?: string;
  contractType?: ContractType | string;
  contractTypeEnum?: string;
  startDate?: string;
  endDate?: string;
  validFrom?: string;
  validTo?: string;
  signedAt?: string;
  status: "ACTIVE" | "EXPIRED" | "TERMINATED" | "INACTIVE" | string;
  baseSalary: number;
  salaryTypeEnum?: "HOURLY" | "DAILY" | "MONTHLY" | string;
  fileKey?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  downloadUrl?: string;
  originalFileDownloadUrl?: string;
  signingStatus?: "PENDING_COMPANY_SIGN" | "PENDING_EMPLOYEE_SIGN" | "FULLY_SIGNED" | string;
  signingToken?: string;
  signingTokenExpiresAt?: string;
  createdBy?: string;
  createdAt?: string;
  updatedBy?: string;
  updatedAt?: string;
}

export interface AttendanceRecordItem {
  id: string;
  employeeId: string;
  employeeName: string;
  workDate: string;
  checkInTime?: string;
  checkOutTime?: string;
  status: AttendanceStatus;
  penaltyAmount?: number;
}

export interface TeachingRateItem {
  id: string;
  teacherId: string;
  className: string;
  rate: number;
  effectiveFrom: string;
  effectiveTo?: string;
  status: TeachingRateStatus;
}

export interface TeachingSessionPaymentItem {
  id: string;
  teacherId: string;
  className: string;
  sessionDate: string;
  actualDurationMin: number;
  rateApplied: number;
  amount: number;
  status: TeachingSessionStatus;
  isDraftOver24h?: boolean;
}

export interface SalaryPeriodItem {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  employmentType: EmploymentType;
  period: string; // e.g. "2026-07"
  grossSalary: number;
  insuranceDeduction: number;
  taxDeduction: number;
  penaltyDeduction: number;
  netSalary: number;
  status: SalaryStatus;
  paidAt?: string;
}

export interface LeaveRequestItem {
  id: string;
  employeeId: string;
  employeeName: string;
  startDate: string;
  endDate: string;
  numDays: number;
  reason: string;
  status: LeaveStatus;
  approvedBy?: string;
  createdAt: string;
}

export interface ApprovalRequestItem {
  id: string;
  objectType: string;
  objectId: string;
  requesterId: string;
  requesterName: string;
  approverId: string;
  approverName: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  rejectReason?: string;
}

export interface EmployeeAuditLogItem {
  id: string;
  userId: string;
  actorName: string;
  action: string;
  entityType: string;
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  timestamp: string;
}
