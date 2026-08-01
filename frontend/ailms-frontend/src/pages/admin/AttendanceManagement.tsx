import React, { useEffect, useState, useMemo } from "react";
import { attendanceAdminApi } from "@/api/attendance/attendanceApi";
import { departmentApi, type DepartmentResponse } from "@/api/departments/departmentApi";
import type {
  AttendanceResponse,
  AttendanceSummaryResponse,
  AttendanceSearchFilters,
  AttendanceStatusEnum,
  AttendanceSourceEnum,
} from "@/types/attendanceManagement";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { DatePickerInput } from "@/components/ui/DatePickerInput";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { AttendanceDetailDrawer } from "@/components/admin/attendance/AttendanceDetailDrawer";
import { SimulateAttendanceModal } from "@/components/admin/attendance/SimulateAttendanceModal";
import {
  getStatusBadge,
  getSourceBadge,
  formatTimeOnly,
  formatDateVietnamese,
} from "@/components/admin/attendance/attendanceUtils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Clock,
  UserX,
  UserMinus,
  Search,
  DownloadCloud,
  FlaskConical,
  RotateCcw,
  Check,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Loader2,
  X,
  Building2,
} from "lucide-react";

import {
  formatLocalDate,
  getTodayDateRange,
  getThisWeekDateRange,
  getThisMonthDateRange,
} from "@/utils/dateUtils";

type QuickPeriodType = "TODAY" | "THIS_WEEK" | "THIS_MONTH" | "CUSTOM";

export const AttendanceManagement: React.FC = () => {
  // --- States Khoảng Thời Gian ---
  const [quickPeriod, setQuickPeriod] = useState<QuickPeriodType>("THIS_MONTH");
  const [dateFrom, setDateFrom] = useState<string>(() => getThisMonthDateRange().dateFrom);
  const [dateTo, setDateTo] = useState<string>(() => getThisMonthDateRange().dateTo);

  // --- States Phòng Ban ---
  const [departments, setDepartments] = useState<DepartmentResponse[]>([]);
  const [departmentFilter, setDepartmentFilter] = useState<string | "ALL">("ALL");

  // --- States Summary & Chart ---
  const [summaryData, setSummaryData] = useState<AttendanceSummaryResponse | null>(null);
  const [loadingSummary, setLoadingSummary] = useState<boolean>(false);

  // --- States Danh Sách Bảng ---
  const [attendances, setAttendances] = useState<AttendanceResponse[]>([]);
  const [loadingList, setLoadingList] = useState<boolean>(false);
  const [totalElements, setTotalElements] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(10);

  // --- States Filters ---
  const [keywordInput, setKeywordInput] = useState<string>("");
  const [debouncedKeyword, setDebouncedKeyword] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<AttendanceStatusEnum | "ALL">("ALL");
  const [sourceFilter, setSourceFilter] = useState<AttendanceSourceEnum | "ALL">("ALL");

  // --- States Selection & Drawer/Modal ---
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedAttendance, setSelectedAttendance] = useState<AttendanceResponse | null>(null);
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [simulateModalOpen, setSimulateModalOpen] = useState<boolean>(false);
  const [confirmBulkApproveOpen, setConfirmBulkApproveOpen] = useState<boolean>(false);
  const [bulkApproveLoading, setBulkApproveLoading] = useState<boolean>(false);

  // --- Banner Thông Báo ---
  const [bannerMsg, setBannerMsg] = useState<{ text: string; isError?: boolean } | null>(null);

  const todayStr = useMemo(() => formatLocalDate(new Date()), []);

  const showBanner = (text: string, isError = false) => {
    setBannerMsg({ text, isError });
    setTimeout(() => setBannerMsg(null), 5000);
  };

  // Fetch danh sách phòng ban
  useEffect(() => {
    departmentApi
      .getAllDepartments()
      .then((res) => {
        if (res?.data?.data) {
          setDepartments(res.data.data);
        }
      })
      .catch(() => null);
  }, []);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(keywordInput);
    }, 400);
    return () => clearTimeout(timer);
  }, [keywordInput]);

  // Handle Quick Period Change
  const handlePeriodChange = (period: QuickPeriodType) => {
    setQuickPeriod(period);
    if (period === "TODAY") {
      const range = getTodayDateRange();
      setDateFrom(range.dateFrom);
      setDateTo(range.dateTo);
    } else if (period === "THIS_WEEK") {
      const range = getThisWeekDateRange();
      setDateFrom(range.dateFrom);
      setDateTo(range.dateTo);
    } else if (period === "THIS_MONTH") {
      const range = getThisMonthDateRange();
      setDateFrom(range.dateFrom);
      setDateTo(range.dateTo);
    }
  };

  // Fetch Summary Data
  const fetchSummary = async () => {
    try {
      setLoadingSummary(true);
      const data = await attendanceAdminApi.getSummary({
        fromDate: dateFrom,
        toDate: dateTo,
        departmentId: departmentFilter !== "ALL" ? departmentFilter : undefined,
      });
      setSummaryData(data);
    } catch (err: any) {
      console.error("Failed to fetch attendance summary:", err);
    } finally {
      setLoadingSummary(false);
    }
  };

  // Fetch List Data
  const fetchList = async () => {
    try {
      setLoadingList(true);
      const res = await attendanceAdminApi.getAttendances({
        keyword: debouncedKeyword,
        workDateFrom: dateFrom,
        workDateTo: dateTo,
        status: statusFilter,
        source: sourceFilter,
        departmentId: departmentFilter !== "ALL" ? departmentFilter : undefined,
        page: currentPage,
        size: pageSize,
        sortBy: "workDate",
        sortDir: "DESC",
      });

      setAttendances(res.content || []);
      setTotalElements(res.totalElements || 0);
      setTotalPages(res.totalPages || 1);
    } catch (err: any) {
      console.error("Failed to fetch attendance list:", err);
      showBanner("Lỗi khi tải danh sách chấm công", true);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchSummary();
    fetchList();
  }, [dateFrom, dateTo, debouncedKeyword, statusFilter, sourceFilter, departmentFilter, currentPage, pageSize]);

  // Bulk Approve Action
  const executeBulkApprove = async () => {
    if (selectedIds.length === 0) return;
    try {
      setBulkApproveLoading(true);
      await attendanceAdminApi.bulkApprove(selectedIds);
      showBanner(`Đã phê duyệt thành công ${selectedIds.length} bản ghi chấm công!`);
      setSelectedIds([]);
      setConfirmBulkApproveOpen(false);
      fetchSummary();
      fetchList();
    } catch (err: any) {
      console.error("Bulk approve failed:", err);
      showBanner("Lỗi khi phê duyệt hàng loạt", true);
    } finally {
      setBulkApproveLoading(false);
    }
  };

  // Selection Checkbox Logic
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(attendances.map((item) => item.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((item) => item !== id));
    }
  };

  // Export CSV Action
  const handleExportCsv = async () => {
    try {
      showBanner("Đang khởi tạo tệp xuất báo cáo CSV...");
      const blob = await attendanceAdminApi.exportCsv({
        workDateFrom: dateFrom,
        workDateTo: dateTo,
        status: statusFilter,
        source: sourceFilter,
        departmentId: departmentFilter !== "ALL" ? departmentFilter : undefined,
      });

      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Bao_Cao_Cham_Cong_${dateFrom}_${dateTo}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      showBanner("Đã tải xuống báo cáo CSV thành công!");
    } catch (err: any) {
      console.error("Export CSV failed:", err);
      showBanner("Lỗi xuất file CSV", true);
    }
  };

  // Department Bar Chart Data
  const deptBarData = useMemo(() => {
    if (!summaryData?.lateCountByDepartment) return [];
    return Object.entries(summaryData.lateCountByDepartment).map(([name, count]) => ({
      name,
      value: count,
    }));
  }, [summaryData]);

  const handleResetFilters = () => {
    setStatusFilter("ALL");
    setSourceFilter("ALL");
    setDepartmentFilter("ALL");
    setKeywordInput("");
    const range = getThisMonthDateRange();
    setDateFrom(range.dateFrom);
    setDateTo(range.dateTo);
    setQuickPeriod("THIS_MONTH");
    setCurrentPage(0);
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Banner Floating Notify */}
      {bannerMsg && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg border text-sm flex items-center gap-2 animate-in slide-in-from-top duration-200 ${
            bannerMsg.isError
              ? "bg-red-50 border-red-200 text-red-700 dark:bg-red-950 dark:border-red-800 dark:text-red-300"
              : "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-300"
          }`}
        >
          {bannerMsg.isError ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
          <span>{bannerMsg.text}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2 font-heading">
            <Clock className="h-6 w-6 text-primary" /> Quản Lý Chấm Công Hàng Ngày
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Theo dõi, rà soát dữ liệu ra/vào ca làm việc của nhân sự, quản lý đi muộn/vắng mặt và xuất báo cáo công tháng.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Segmented Control Chọn Nhanh Ngày */}
          <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border/60">
            <button
              onClick={() => handlePeriodChange("TODAY")}
              className={`px-3.5 py-1.5 text-xs rounded-lg transition-all ${
                quickPeriod === "TODAY"
                  ? "bg-primary text-primary-foreground font-bold shadow-sm"
                  : "text-muted-foreground hover:text-foreground font-medium"
              }`}
            >
              Hôm nay
            </button>
            <button
              onClick={() => handlePeriodChange("THIS_WEEK")}
              className={`px-3.5 py-1.5 text-xs rounded-lg transition-all ${
                quickPeriod === "THIS_WEEK"
                  ? "bg-primary text-primary-foreground font-bold shadow-sm"
                  : "text-muted-foreground hover:text-foreground font-medium"
              }`}
            >
              Tuần này
            </button>
            <button
              onClick={() => handlePeriodChange("THIS_MONTH")}
              className={`px-3.5 py-1.5 text-xs rounded-lg transition-all ${
                quickPeriod === "THIS_MONTH"
                  ? "bg-primary text-primary-foreground font-bold shadow-sm"
                  : "text-muted-foreground hover:text-foreground font-medium"
              }`}
            >
              Tháng này
            </button>
          </div>

          {/* Header Date Range Pickers (Sửa lỗi overlap icon & text) */}
          <div className="flex items-center gap-2 bg-card px-3 py-1 rounded-xl border border-border/60">
            <div className="w-36">
              <DatePickerInput
                value={dateFrom}
                onChange={(val) => {
                  setDateFrom(val);
                  setQuickPeriod("CUSTOM");
                }}
              />
            </div>
            <span className="text-xs text-muted-foreground font-bold">-</span>
            <div className="w-36">
              <DatePickerInput
                value={dateTo}
                onChange={(val) => {
                  setDateTo(val);
                  setQuickPeriod("CUSTOM");
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Khu vực 1: 3 Metric Cards (Thống kê theo khoảng thời gian được chọn) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Đi muộn (Warning Amber) */}
        <Card className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 shadow-2xs hover:border-amber-500/50 transition-all">
          <div className="flex items-center justify-between text-amber-700 dark:text-amber-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wide">Đi muộn (Late)</span>
            <Clock className="h-4 w-4 text-amber-500 animate-pulse" />
          </div>
          {loadingSummary ? (
            <Skeleton className="h-7 w-16 rounded-md" />
          ) : (
            <div>
              <div className="text-2xl font-black text-amber-700 dark:text-amber-400">
                {summaryData?.lateCount || 0} <span className="text-xs font-normal opacity-80">lượt</span>
              </div>
              <p className="text-[11px] text-amber-700/70 dark:text-amber-400/70 mt-1">
                Tổng lượt muộn trong khoảng thời gian chọn
              </p>
            </div>
          )}
        </Card>

        {/* Card 2: Vắng mặt (Warning Red) */}
        <Card className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 shadow-2xs hover:border-red-500/50 transition-all">
          <div className="flex items-center justify-between text-red-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wide">Vắng mặt (Absent)</span>
            <UserX className="h-4 w-4 text-red-500" />
          </div>
          {loadingSummary ? (
            <Skeleton className="h-7 w-16 rounded-md" />
          ) : (
            <div>
              <div className="text-2xl font-black text-red-600">
                {summaryData?.absentCount || 0} <span className="text-xs font-normal text-red-600/70">lượt</span>
              </div>
              <p className="text-[11px] text-red-600/70 mt-1">
                Tổng lượt vắng trong khoảng thời gian chọn
              </p>
            </div>
          )}
        </Card>

        {/* Card 3: Nghỉ phép (Purple) */}
        <Card className="p-4 rounded-xl border border-purple-500/30 bg-purple-500/10 shadow-2xs hover:border-purple-500/50 transition-all">
          <div className="flex items-center justify-between text-purple-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wide">Nghỉ phép (On Leave)</span>
            <UserMinus className="h-4 w-4 text-purple-500" />
          </div>
          {loadingSummary ? (
            <Skeleton className="h-7 w-16 rounded-md" />
          ) : (
            <div>
              <div className="text-2xl font-black text-purple-600">
                {summaryData?.onLeaveCount || 0} <span className="text-xs font-normal text-purple-600/70">lượt</span>
              </div>
              <p className="text-[11px] text-purple-600/70 mt-1">
                Tổng lượt nghỉ phép trong khoảng thời gian chọn
              </p>
            </div>
          )}
        </Card>
      </div>

      {/* Biểu đồ số lượt đi muộn theo phòng ban (Nếu có dữ liệu) */}
      {deptBarData.length > 0 && (
        <Card className="p-4 rounded-xl border border-border/60 bg-card shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <BarChart3 className="h-4 w-4 text-blue-500" /> Số lượt đi muộn theo phòng ban
            </h3>
          </div>

          <div className="h-[180px] w-full">
            {loadingSummary ? (
              <Skeleton className="h-full w-full rounded-xl" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptBarData} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(150,150,150,0.15)" />
                  <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={120} />
                  <Tooltip
                    formatter={(val: any) => [`${val} lượt muộn`, "Đi muộn"]}
                    contentStyle={{ borderRadius: "8px", fontSize: "12px" }}
                  />
                  <Bar dataKey="value" fill="#f59e0b" radius={[0, 6, 6, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      )}

      {/* Khu vực 2: CARD BẢNG DỮ LIỆU CÔNG (Giao diện theo chuẩn RoleManagement) */}
      <Card className="border-border shadow-sm bg-card overflow-hidden">
        {/* Header & Main Actions */}
        <CardHeader className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-border/30 bg-card">
          <div>
            <CardTitle className="text-xl font-semibold tracking-tight font-heading flex items-center gap-2">
              <span>Danh sách bản ghi chấm công</span>
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground mt-0.5">
              Theo dõi, rà soát dữ liệu ra/vào ca làm việc của nhân sự, quản lý đi muộn/vắng mặt và điều chỉnh công.
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              className="h-9 text-xs gap-1.5 rounded-lg border-border/40 font-semibold cursor-pointer shadow-xs"
            >
              <DownloadCloud className="h-4 w-4" /> <span>Xuất CSV</span>
            </Button>

            <Button
              size="sm"
              onClick={() => setSimulateModalOpen(true)}
              className="h-9 text-xs gap-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold cursor-pointer shadow-xs"
            >
              <FlaskConical className="h-4 w-4" /> <span>Sinh dữ liệu giả lập</span>
            </Button>
          </div>
        </CardHeader>

        {/* UNIFIED FILTER & SEARCH TOOLBAR FORM (Phong cách RoleManagement + Lọc Phòng ban & Khoảng thời gian) */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setCurrentPage(0);
            fetchList();
          }}
          className="py-3 px-4 bg-muted/20 border-b border-border/30 flex flex-wrap items-end gap-3 w-full"
        >
          {/* Search Input */}
          <div className="flex flex-col gap-1 flex-1 min-w-48">
            <Label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Từ khóa tìm kiếm</Label>
            <div className="relative w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                placeholder="Tìm theo tên hoặc mã NV..."
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                className="pl-8 h-9 text-sm border border-border/30 bg-background rounded-lg focus-visible:ring-2 focus-visible:ring-primary/20 placeholder:opacity-50"
              />
            </div>
          </div>

          {/* Phòng ban Filter */}
          <div className="flex flex-col gap-1 w-44 shrink-0">
            <Label className="text-xs font-semibold text-muted-foreground whitespace-nowrap flex items-center gap-1">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground" /> Phòng ban
            </Label>
            <Select
              value={departmentFilter}
              onValueChange={(val) => {
                setDepartmentFilter(val);
                setCurrentPage(0);
              }}
            >
              <SelectTrigger className="h-9 text-sm border border-border/30 bg-background rounded-lg w-full">
                <SelectValue placeholder="Tất cả phòng ban" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả phòng ban</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={String(dept.id)}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status Select */}
          <div className="flex flex-col gap-1 w-44 shrink-0">
            <Label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Trạng thái công</Label>
            <Select
              value={statusFilter}
              onValueChange={(val) => {
                setStatusFilter(val as AttendanceStatusEnum | "ALL");
                setCurrentPage(0);
              }}
            >
              <SelectTrigger className="h-9 text-sm border border-border/30 bg-background rounded-lg w-full">
                <SelectValue placeholder="Tất cả trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
                <SelectItem value="PRESENT">Đúng giờ (PRESENT)</SelectItem>
                <SelectItem value="LATE">Đi muộn (LATE)</SelectItem>
                <SelectItem value="PRESENT_LATE">Có mặt muộn</SelectItem>
                <SelectItem value="HALF_DAY">Nửa ngày (HALF_DAY)</SelectItem>
                <SelectItem value="ON_LEAVE">Nghỉ phép (ON_LEAVE)</SelectItem>
                <SelectItem value="ABSENT">Vắng mặt (ABSENT)</SelectItem>
                <SelectItem value="INVALID">Cần rà soát (INVALID)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Source Select */}
          <div className="flex flex-col gap-1 w-44 shrink-0">
            <Label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Nguồn dữ liệu</Label>
            <Select
              value={sourceFilter}
              onValueChange={(val) => {
                setSourceFilter(val as AttendanceSourceEnum | "ALL");
                setCurrentPage(0);
              }}
            >
              <SelectTrigger className="h-9 text-sm border border-border/30 bg-background rounded-lg w-full">
                <SelectValue placeholder="Tất cả nguồn" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả nguồn</SelectItem>
                <SelectItem value="DEVICE">Máy chấm công (DEVICE)</SelectItem>
                <SelectItem value="MANUAL">Sửa thủ công (MANUAL)</SelectItem>
                <SelectItem value="SIMULATED">Giả lập (SIMULATED)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Từ ngày công */}
          <div className="w-36 shrink-0">
            <DatePickerInput
              label="Từ ngày công"
              value={dateFrom}
              onChange={(isoDate) => {
                setDateFrom(isoDate);
                setQuickPeriod("CUSTOM");
                setCurrentPage(0);
              }}
            />
          </div>

          {/* Đến ngày công */}
          <div className="w-36 shrink-0">
            <DatePickerInput
              label="Đến ngày công"
              value={dateTo}
              onChange={(isoDate) => {
                setDateTo(isoDate);
                setQuickPeriod("CUSTOM");
                setCurrentPage(0);
              }}
            />
          </div>

          {/* Filter Buttons */}
          <div className="flex items-center gap-1.5 shrink-0 self-end">
            <Button
              type="submit"
              size="sm"
              className="h-9 font-semibold bg-primary text-primary-foreground text-xs rounded-lg px-3 cursor-pointer"
            >
              <Search className="h-3.5 w-3.5 mr-1" /> Lọc
            </Button>
            <Button
              type="button"
              onClick={handleResetFilters}
              variant="outline"
              size="sm"
              className="h-9 text-xs text-muted-foreground hover:text-foreground rounded-lg px-2.5 border border-border/30 bg-background flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" /> Đặt lại
            </Button>
          </div>
        </form>

        {/* BULK ACTION TOOLBAR (Thanh thao tác hàng loạt) */}
        {selectedIds.length > 0 && (
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-primary/10 border-b border-primary/20 text-xs animate-in fade-in-50 duration-200">
            <div className="flex items-center gap-2 font-bold text-primary">
              <CheckCircle2 className="h-4 w-4" />
              <span>Đã chọn {selectedIds.length} bản ghi chấm công</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                onClick={() => setSelectedIds([])}
                variant="outline"
                size="sm"
                className="h-7 text-xs font-semibold text-muted-foreground hover:text-foreground border-border/40 bg-background rounded-lg cursor-pointer gap-1"
              >
                <X className="h-3.5 w-3.5" />
                <span>Bỏ chọn tất cả</span>
              </Button>
              <Button
                onClick={() => setConfirmBulkApproveOpen(true)}
                size="sm"
                disabled={bulkApproveLoading}
                className="h-7 text-xs font-semibold gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs"
              >
                {bulkApproveLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
                Duyệt hàng loạt ({selectedIds.length})
              </Button>
            </div>
          </div>
        )}

        {/* TABLE CONTAINER */}
        <CardContent className="p-0 relative min-h-75">
          {loadingList && (
            <div className="absolute inset-0 bg-background/60 backdrop-blur-xs flex items-center justify-center z-20">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
          )}

          <Table containerClassName="max-h-[calc(100vh-240px)] min-h-[240px] overflow-auto border-b border-border/20">
            <TableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur-md shadow-2xs border-b border-border/40">
              <TableRow className="border-b border-border/30 bg-muted/20 hover:bg-muted/20">
                <TableHead className="w-10 pb-3">
                  <Checkbox
                    checked={attendances.length > 0 && selectedIds.length === attendances.length}
                    onCheckedChange={(checked) => handleSelectAll(!!checked)}
                    className="translate-y-0.5 border-border/30"
                  />
                </TableHead>
                <TableHead className="pb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Nhân viên
                </TableHead>
                <TableHead className="pb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Ngày công
                </TableHead>
                <TableHead className="pb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Ca làm việc
                </TableHead>
                <TableHead className="pb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground text-center">
                  Giờ vào (In)
                </TableHead>
                <TableHead className="pb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground text-center">
                  Giờ ra (Out)
                </TableHead>
                <TableHead className="pb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground text-center">
                  Phút muộn / sớm
                </TableHead>
                <TableHead className="pb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground text-center">
                  Trạng thái
                </TableHead>
                <TableHead className="pb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground text-center">
                  Nguồn
                </TableHead>
                <TableHead className="pb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">
                  Thao tác
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody className="opacity-90">
              {attendances.length === 0 && !loadingList ? (
                <TableRow>
                  <TableCell colSpan={10} className="py-12 text-center text-muted-foreground text-sm">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertTriangle className="h-6 w-6 text-amber-500/70" />
                      {dateFrom > todayStr ? (
                        <span>Chưa tới ngày làm việc.</span>
                      ) : (
                        <span>
                          Không tìm thấy dữ liệu chấm công nào phù hợp với bộ lọc. Vui lòng thử lại hoặc bấm <b>"Sinh dữ liệu giả lập"</b>.
                        </span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                attendances.map((item) => {
                  const isSelected = selectedIds.includes(item.id);

                  return (
                    <TableRow
                      key={item.id}
                      className={`transition-colors border-b border-border/30 hover:bg-muted/30 cursor-pointer text-xs ${
                        isSelected ? "bg-primary/5 font-medium" : ""
                      }`}
                      onClick={() => {
                        setSelectedAttendance(item);
                        setDrawerOpen(true);
                      }}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => handleSelectOne(item.id, !!checked)}
                          className="translate-y-0.5 border-border/30"
                        />
                      </TableCell>

                      {/* Cột Nhân Viên */}
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2.5">
                          {item.avatarUrl ? (
                            <img
                              src={item.avatarUrl}
                              alt={item.employeeName}
                              className="h-8 w-8 rounded-full object-cover border border-border/60"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs">
                              {item.employeeName ? item.employeeName.slice(0, 2).toUpperCase() : "NV"}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="font-semibold text-foreground truncate">
                              {item.employeeName || `Nhân viên #${item.employeeId}`}
                            </div>
                            <div className="text-[11px] text-muted-foreground font-mono">
                              {item.employeeCode || "N/A"} {item.departmentName ? `• ${item.departmentName}` : ""}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      {/* Cột Ngày công */}
                      <TableCell className="font-semibold text-muted-foreground whitespace-nowrap">
                        {formatDateVietnamese(item.workDate)}
                      </TableCell>

                      {/* Cột Ca làm việc */}
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {item.workShiftName || "Ca hành chính"}
                      </TableCell>

                      {/* Cột Check-in */}
                      <TableCell className="text-center font-mono font-bold text-emerald-600 whitespace-nowrap">
                        {formatTimeOnly(item.checkInTime)}
                      </TableCell>

                      {/* Cột Check-out */}
                      <TableCell className="text-center font-mono font-bold text-blue-600 whitespace-nowrap">
                        {formatTimeOnly(item.checkOutTime)}
                      </TableCell>

                      {/* Cột Số phút muộn/sớm */}
                      <TableCell className="text-center whitespace-nowrap">
                        {item.lateMinutes && item.lateMinutes > 0 ? (
                          <span className="font-mono font-bold text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded">
                            Muộn {item.lateMinutes}m
                          </span>
                        ) : item.earlyLeaveMinutes && item.earlyLeaveMinutes > 0 ? (
                          <span className="font-mono font-bold text-blue-600 bg-blue-500/10 px-1.5 py-0.5 rounded">
                            Sớm {item.earlyLeaveMinutes}m
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-[11px]">--</span>
                        )}
                      </TableCell>

                      {/* Cột Trạng thái */}
                      <TableCell className="text-center whitespace-nowrap">
                        {getStatusBadge(item.status)}
                      </TableCell>

                      {/* Cột Nguồn */}
                      <TableCell className="text-center whitespace-nowrap">
                        {getSourceBadge(item.source)}
                      </TableCell>

                      {/* Cột Thao tác */}
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedAttendance(item);
                            setDrawerOpen(true);
                          }}
                          className="h-8 text-xs rounded-lg hover:bg-muted font-medium"
                        >
                          Chi tiết
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>

        {/* PAGINATION FOOTER (Phong cách RoleManagement) */}
        <CardFooter className="px-4 py-3 border-t border-border/30 bg-card flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="text-muted-foreground">
            Hiển thị <b>{attendances.length}</b> / <b>{totalElements}</b> bản ghi công
          </div>

          <div className="flex items-center gap-3">
            {/* Rows Per Page */}
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Hiển thị:</span>
              <Select value={String(pageSize)} onValueChange={(val) => { setPageSize(Number(val)); setCurrentPage(0); }}>
                <SelectTrigger className="h-8 text-xs rounded-lg w-24 bg-background">
                  <SelectValue placeholder="Số dòng" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 dòng</SelectItem>
                  <SelectItem value="20">20 dòng</SelectItem>
                  <SelectItem value="50">50 dòng</SelectItem>
                  <SelectItem value="100">100 dòng</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Page Navigation */}
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 0}
                onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
                className="h-8 w-8 p-0 rounded-lg"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <span className="px-2 font-semibold text-foreground">
                {currentPage + 1} / {totalPages}
              </span>

              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages - 1}
                onClick={() => setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1))}
                className="h-8 w-8 p-0 rounded-lg"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardFooter>
      </Card>

      {/* Drawer Chi tiết & Sửa thủ công */}
      <AttendanceDetailDrawer
        attendance={selectedAttendance}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onRefresh={() => {
          fetchSummary();
          fetchList();
        }}
        onActionSuccess={(msg) => showBanner(msg)}
      />

      {/* Modal Sinh dữ liệu giả lập */}
      <SimulateAttendanceModal
        isOpen={simulateModalOpen}
        onClose={() => setSimulateModalOpen(false)}
        defaultFromDate={dateFrom}
        defaultToDate={dateTo}
        onSuccess={(msg) => {
          showBanner(msg);
          fetchSummary();
          fetchList();
        }}
        onError={(msg) => {
          showBanner(msg, true);
        }}
      />

      {/* Confirm Bulk Approve Dialog */}
      <ConfirmDialog
        open={confirmBulkApproveOpen}
        onOpenChange={setConfirmBulkApproveOpen}
        title="XÁC NHẬN PHÊ DUYỆT HÀNG LOẠT"
        description={`Bạn có chắc chắn muốn PHÊ DUYỆT HÀNG LOẠT ${selectedIds.length} bản ghi chấm công đã chọn?`}
        variant="warning"
        confirmText="Duyệt tất cả"
        onConfirm={executeBulkApprove}
      />
    </div>
  );
};
