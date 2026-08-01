export type AttendanceStatusEnum =
  | "PRESENT"
  | "LATE"
  | "ABSENT"
  | "ON_LEAVE"
  | "HALF_DAY"
  | "CANCELLED"
  | "INVALID"
  | "PRESENT_LATE"
  | "HALF_DAY_LATE";

export type AttendanceSourceEnum = "DEVICE" | "MANUAL" | "SIMULATED";

export interface AttendanceResponse {
  id: string;
  employeeId: string;
  employeeName?: string;
  employeeCode?: string;
  departmentName?: string;
  avatarUrl?: string;
  workDate: string;
  workShiftId?: string;
  workShiftName?: string;
  checkInTime?: string;
  checkOutTime?: string;
  status: AttendanceStatusEnum;
  workedMinutes?: number;
  lateMinutes?: number;
  earlyLeaveMinutes?: number;
  overtimeMinutes?: number;
  source: AttendanceSourceEnum;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  note?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface DailyTrendPoint {
  date: string;
  dayLabel: string;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  onLeaveCount: number;
}

export interface AttendanceSummaryResponse {
  totalEmployeesToday: number;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  onLeaveCount: number;
  totalOvertimeHoursThisWeek: number;
  lateCountByDepartment: Record<string, number>;
  weeklyTrend: DailyTrendPoint[];
}

export interface AttendanceSearchFilters {
  keyword?: string;
  workDateFrom?: string;
  workDateTo?: string;
  status?: AttendanceStatusEnum | "ALL";
  source?: AttendanceSourceEnum | "ALL";
  departmentId?: string | number | "ALL";
  workShiftId?: string | number | "ALL";
  page?: number;
  size?: number;
  sortBy?: string;
  sortDir?: "ASC" | "DESC";
}

export interface SimulateAttendanceRequest {
  fromDate: string;
  toDate: string;
  employeeIds?: (string | number)[];
  overwriteExisting?: boolean;
}

export interface UpdateAttendanceRequest {
  workDate?: string;
  workShiftId?: string | number;
  checkInTime?: string;
  checkOutTime?: string;
  status?: AttendanceStatusEnum;
  note: string;
}
