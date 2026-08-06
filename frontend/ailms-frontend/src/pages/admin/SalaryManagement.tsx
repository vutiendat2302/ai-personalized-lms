import React, { useEffect, useState, useMemo, useRef } from "react";
import { salaryApi } from "@/api/salary/salaryApi";
import { useToast } from "@/hooks/useToast";
import { useAuth } from "@/hooks/useAuth";
import { departmentApi, type DepartmentResponse } from "@/api/departments/departmentApi";
import type {
  SalaryResponse,
  SalarySummaryResponse,
  SalaryStatusEnum,
  SalaryTypeEnum,
  PayrollBatchResponse,
} from "@/types/salaryManagement";
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
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { GenerateSalaryModal } from "@/components/admin/salary/GenerateSalaryModal";
import { SalaryDetailDrawer } from "@/components/admin/salary/SalaryDetailDrawer";
import {
  formatVND,
  getStatusBadge,
  getSalaryTypeBadge,
} from "@/components/admin/salary/salaryUtils";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  DollarSign,
  FileSpreadsheet,
  Clock,
  CheckCircle2,
  CreditCard,
  Calculator,
  Search,
  DownloadCloud,
  RotateCcw,
  Check,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Loader2,
  X,
  Building2,
  TrendingUp,
  Trash2,
  Send,
  Eye,
} from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "#9ca3af",
  PENDING: "#f59e0b",
  CONFIRMED: "#3b82f6",
  TRANSFER_EXPORTED: "#8b5cf6",
  PAID: "#10b981",
};

export const SalaryManagement: React.FC = () => {
  const { success, error } = useToast();
  const { auth } = useAuth();
  const normalizedRoles = (auth.user?.roles || []).map(role => String(role).replace("ROLE_", "").toUpperCase());
  const isAdmin = normalizedRoles.includes("ADMIN");
  const isHr = normalizedRoles.includes("HR") && !isAdmin;
  const currentYear = new Date().getFullYear();
  const [periodMode, setPeriodMode] = useState<"ALL" | "MONTH" | "QUARTER" | "YEAR">("ALL");
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedQuarter, setSelectedQuarter] = useState(Math.floor(new Date().getMonth() / 3) + 1);
  // --- State Kỳ Lương (Default: tháng hiện tại YYYY-MM) ---
  const [period, setPeriod] = useState<string>(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  });

  const periodRange = useMemo(() => {
    if (periodMode === "ALL") return { from: "2000-01", to: period, label: "Tất cả kỳ lương" };
    if (periodMode === "MONTH") return { from: period, to: period, label: `Tháng ${period.slice(5, 7)}/${period.slice(0, 4)}` };
    if (periodMode === "QUARTER") {
      const startMonth = (selectedQuarter - 1) * 3 + 1;
      return {
        from: `${selectedYear}-${String(startMonth).padStart(2, "0")}`,
        to: `${selectedYear}-${String(startMonth + 2).padStart(2, "0")}`,
        label: `Quý ${selectedQuarter}/${selectedYear}`,
      };
    }
    return { from: `${selectedYear}-01`, to: `${selectedYear}-12`, label: `Năm ${selectedYear}` };
  }, [periodMode, period, selectedQuarter, selectedYear]);

  // --- States Phòng Ban ---
  const [departments, setDepartments] = useState<DepartmentResponse[]>([]);

  // --- States Summary & Charts ---
  const [summaryData, setSummaryData] = useState<SalarySummaryResponse | null>(null);
  const [loadingSummary, setLoadingSummary] = useState<boolean>(false);

  // --- States Danh Sách Bảng ---
  const [salaries, setSalaries] = useState<SalaryResponse[]>([]);
  const [loadingList, setLoadingList] = useState<boolean>(false);
  const [totalElements, setTotalElements] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(10);

  // --- States Filters ---
  const [keywordInput, setKeywordInput] = useState<string>("");
  const [debouncedKeyword, setDebouncedKeyword] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<SalaryStatusEnum | "ALL">("ALL");
  const [departmentFilter, setDepartmentFilter] = useState<string | "ALL">("ALL");
  const [salaryTypeFilter, setSalaryTypeFilter] = useState<SalaryTypeEnum | "ALL">("ALL");

  // --- States Selection & Modal/Drawer ---
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedSalary, setSelectedSalary] = useState<SalaryResponse | null>(null);
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [generateModalOpen, setGenerateModalOpen] = useState<boolean>(false);
  const [confirmBulkPayOpen, setConfirmBulkPayOpen] = useState<boolean>(false);
  const [bulkActionLoading, setBulkActionLoading] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<"BATCHES" | "DETAIL">("BATCHES");
  const [payrollBatches, setPayrollBatches] = useState<PayrollBatchResponse[]>([]);
  const [allPayrollBatches, setAllPayrollBatches] = useState<PayrollBatchResponse[]>([]);
  const [chartGroupBy, setChartGroupBy] = useState<"MONTH" | "QUARTER" | "YEAR">("MONTH");
  const [chartYear, setChartYear] = useState(currentYear);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [draftToDelete, setDraftToDelete] = useState<string | null>(null);
  const [approvedToDelete, setApprovedToDelete] = useState<string | null>(null);
  const [batchKeyword, setBatchKeyword] = useState("");
  const [batchStatus, setBatchStatus] = useState<SalaryStatusEnum | "ALL" | "APPROVED">("ALL");
  const [rejectingPeriod, setRejectingPeriod] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const payrollBatchRequestRef = useRef(0);

  const showBanner = (text: string, isError = false) => {
    if (isError) error(text);
    else success(text);
  };
  const formatDateTime = (value?: string) => value ? new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value)) : "—";

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

  // Debounce keyword input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(keywordInput);
    }, 400);
    return () => clearTimeout(timer);
  }, [keywordInput]);

  // Fetch Summary Data
  const fetchSummary = async () => {
    try {
      setLoadingSummary(true);
      const data = await salaryApi.getSummaryRange({ periodFrom: periodRange.from, periodTo: periodRange.to });
      setSummaryData(data);
    } catch (err: any) {
      console.error("Failed to fetch salary summary:", err);
    } finally {
      setLoadingSummary(false);
    }
  };

  // Fetch List Data
  const fetchList = async () => {
    try {
      setLoadingList(true);
      const res = await salaryApi.getSalaries({
        keyword: debouncedKeyword,
        period: periodMode === "MONTH" ? period : undefined,
        periodFrom: periodMode === "MONTH" ? undefined : periodRange.from,
        periodTo: periodMode === "MONTH" ? undefined : periodRange.to,
        status: statusFilter,
        departmentId: departmentFilter !== "ALL" ? departmentFilter : undefined,
        salaryTypeEnum: salaryTypeFilter !== "ALL" ? salaryTypeFilter : undefined,
        page: currentPage,
        size: pageSize,
      });

      setSalaries(res.content || []);
      setTotalElements(res.totalElements || 0);
      setTotalPages(res.totalPages || 1);
    } catch (err: any) {
      console.error("Failed to fetch salary list:", err);
      showBanner("Lỗi khi tải danh sách bảng lương", true);
    } finally {
      setLoadingList(false);
    }
  };

  const fetchPayrollBatches = async () => {
    const requestId = ++payrollBatchRequestRef.current;
    try {
      setLoadingBatches(true);
      const allRange = { periodFrom: "2000-01", periodTo: "2100-12" };
      if (periodMode === "ALL") {
        const all = await salaryApi.getPayrollBatches(allRange);
        if (requestId !== payrollBatchRequestRef.current) return;
        setPayrollBatches(all); setAllPayrollBatches(all);
      } else {
        const [filtered, all] = await Promise.all([
          salaryApi.getPayrollBatches({ periodFrom: periodRange.from, periodTo: periodRange.to }),
          salaryApi.getPayrollBatches(allRange),
        ]);
        if (requestId !== payrollBatchRequestRef.current) return;
        setPayrollBatches(filtered); setAllPayrollBatches(all);
      }
    } catch {
      showBanner("Không tải được danh sách bảng lương", true);
    } finally {
      if (requestId === payrollBatchRequestRef.current) setLoadingBatches(false);
    }
  };

  useEffect(() => {
    fetchSummary();
    fetchList();
  }, [periodRange.from, periodRange.to, periodMode, debouncedKeyword, statusFilter, departmentFilter, salaryTypeFilter, currentPage, pageSize]);

  useEffect(() => {
    fetchPayrollBatches();
  }, [periodRange.from, periodRange.to, periodMode, period]);

  const openPayroll = (batch: PayrollBatchResponse) => {
    setPeriodMode("MONTH");
    setPeriod(batch.period);
    setViewMode("DETAIL");
    setCurrentPage(0);
    setStatusFilter("ALL");
  };

  const submitPayroll = async (batchPeriod: string) => {
    try {
      const count = await salaryApi.submitPayroll(batchPeriod);
      showBanner(`Đã gửi ${count} phiếu lương cho Admin duyệt`);
      fetchPayrollBatches(); fetchSummary(); fetchList();
    } catch { showBanner("Không thể gửi bảng lương duyệt", true); }
  };

  const cancelPayrollSubmission = async (batchPeriod: string) => {
    try {
      const count = await salaryApi.cancelPayrollSubmission(batchPeriod);
      showBanner(`Đã hủy gửi duyệt ${count} phiếu và đưa bảng lương về bản nháp`);
      fetchPayrollBatches(); fetchSummary(); fetchList();
    } catch { showBanner("Chỉ người HR tạo bảng lương mới có thể hủy chờ duyệt", true); }
  };

  const approvePayroll = async (batchPeriod: string) => {
    try {
      const count = await salaryApi.approvePayroll(batchPeriod);
      showBanner(`Đã duyệt bảng lương gồm ${count} phiếu`);
      fetchPayrollBatches(); fetchSummary(); fetchList();
    } catch { showBanner("Không thể duyệt bảng lương", true); }
  };

  const rejectPayroll = async () => {
    if (!rejectingPeriod || rejectionReason.trim().length < 5) return;
    try {
      await salaryApi.rejectPayroll(rejectingPeriod, rejectionReason.trim());
      showBanner("Đã từ chối và gửi thông báo hệ thống cùng email cho HR");
      setRejectingPeriod(null); setRejectionReason(""); fetchPayrollBatches(); fetchSummary(); fetchList();
    } catch { showBanner("Không thể từ chối bảng lương", true); }
  };

  const resubmitPayroll = async (batchPeriod: string) => {
    try {
      await salaryApi.resubmitPayroll(batchPeriod);
      showBanner("Đã gửi lại bảng lương cho Admin duyệt");
      fetchPayrollBatches(); fetchSummary(); fetchList();
    } catch { showBanner("Không thể gửi lại bảng lương", true); }
  };

  const deleteDraftPayroll = async () => {
    if (!draftToDelete) return;
    try {
      await salaryApi.deleteDraftPayroll(draftToDelete);
      showBanner(`Đã chuyển bảng lương tháng ${draftToDelete} vào thùng rác`);
      setDraftToDelete(null); fetchPayrollBatches(); fetchSummary(); fetchList();
    } catch { showBanner("HR chỉ được xóa bảng lương nháp hoặc chờ duyệt do mình tạo", true); }
  };

  const deleteApprovedPayroll = async () => {
    if (!approvedToDelete) return;
    try {
      await salaryApi.deleteApprovedPayroll(approvedToDelete);
      showBanner(`Đã xóa bảng lương đã duyệt tháng ${approvedToDelete}`);
      setApprovedToDelete(null); fetchPayrollBatches(); fetchSummary(); fetchList();
    } catch { showBanner("Không thể xóa bảng lương", true); }
  };


  const markPayrollPaid = async (batchPeriod: string) => {
    try {
      const count = await salaryApi.markPayrollPaid(batchPeriod);
      showBanner(`Đã xác nhận thanh toán ${count} phiếu lương`);
      fetchPayrollBatches(); fetchSummary(); fetchList();
    } catch { showBanner("Phải xuất danh sách chuyển khoản trước khi xác nhận thanh toán", true); }
  };

  // Bulk Approve
  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) return;
    try {
      setBulkActionLoading(true);
      await salaryApi.bulkApprove(selectedIds);
      showBanner(`Đã phê duyệt thành công ${selectedIds.length} phiếu lương!`);
      setSelectedIds([]);
      fetchSummary();
      fetchList();
    } catch (err: any) {
      console.error("Bulk approve failed:", err);
      showBanner("Lỗi khi phê duyệt hàng loạt", true);
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Bulk Mark Paid
  const handleBulkMarkPaid = async () => {
    if (selectedIds.length === 0) return;
    try {
      setBulkActionLoading(true);
      await salaryApi.bulkMarkPaid(selectedIds);
      showBanner(`Đã xác nhận thanh toán thành công ${selectedIds.length} phiếu lương!`);
      setSelectedIds([]);
      setConfirmBulkPayOpen(false);
      fetchSummary();
      fetchList();
    } catch (err: any) {
      console.error("Bulk mark paid failed:", err);
      showBanner("Lỗi khi thanh toán hàng loạt", true);
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Selection Logic
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(salaries.map((item) => item.id));
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
      showBanner("Đang khởi tạo báo cáo CSV kỳ lương...");
      const blob = await salaryApi.exportCsvRange({
        periodFrom: periodRange.from,
        periodTo: periodRange.to,
        departmentId: departmentFilter !== "ALL" ? departmentFilter : undefined,
        status: statusFilter !== "ALL" ? statusFilter : undefined,
      });

      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Bao_Cao_Luong_${periodRange.from}_${periodRange.to}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      showBanner("Đã tải xuống báo cáo CSV lương thành công!");
    } catch (err: any) {
      console.error("Export CSV failed:", err);
      showBanner("Lỗi khi xuất file CSV", true);
    }
  };

  const handleExportTransferList = async (batchPeriod?: string) => {
    try {
      if (!batchPeriod) throw new Error("Chưa chọn bảng lương tháng");
      const blob = await salaryApi.exportTransferList(batchPeriod);
      const url = URL.createObjectURL(new Blob([blob]));
      const link = document.createElement("a");
      link.href = url;
      link.download = `Danh_Sach_Chuyen_Khoan_${batchPeriod || periodRange.from}_${batchPeriod || periodRange.to}.csv`;
      link.click(); URL.revokeObjectURL(url);
      showBanner("Đã xuất danh sách chuyển khoản. Bảng lương hiện có thể xác nhận thanh toán.");
      fetchPayrollBatches(); fetchSummary(); fetchList();
    } catch { showBanner("Không thể xuất danh sách chuyển khoản.", true); }
  };

  // Prepare Donut Chart Data
  const pieData = useMemo(() => {
    if (!summaryData?.statusDistribution) return [];
    return Object.entries(summaryData.statusDistribution).map(([name, value]) => ({
      name:
        name === "DRAFT"
          ? "Nháp (DRAFT)"
          : name === "PENDING"
          ? "Chờ duyệt (PENDING)"
          : name === "CONFIRMED"
          ? "Đã duyệt (CONFIRMED)"
          : name === "TRANSFER_EXPORTED"
          ? "Đã xuất chuyển khoản"
          : "Đã thanh toán (PAID)",
      key: name,
      value,
    }));
  }, [summaryData]);

  // Prepare Bar Chart Data
  const deptBarData = useMemo(() => {
    if (!summaryData?.salaryByDepartment) return [];
    return Object.entries(summaryData.salaryByDepartment).map(([name, total]) => ({
      name,
      total,
    }));
  }, [summaryData]);

  const handleResetFilters = () => {
    setStatusFilter("ALL");
    setDepartmentFilter("ALL");
    setSalaryTypeFilter("ALL");
    setKeywordInput("");
    setCurrentPage(0);
  };

  const selectedSalaryRows = salaries.filter(item => selectedIds.includes(item.id));
  const canApproveSelection = selectedSalaryRows.length > 0 && selectedSalaryRows.every(item => item.status === "PENDING");
  const canPaySelection = selectedSalaryRows.length > 0 && selectedSalaryRows.every(item => item.status === "TRANSFER_EXPORTED");
  const roleVisiblePayrollBatches = payrollBatches;
  const visiblePayrollBatches = roleVisiblePayrollBatches.filter(batch => {
    const term = batchKeyword.trim().toLowerCase();
    const keywordMatched = !term || batch.period.includes(term) || `payroll-${batch.period}`.includes(term);
    const statusMatched = batchStatus === "ALL" || (batchStatus === "APPROVED"
      ? ["CONFIRMED", "TRANSFER_EXPORTED", "PAID"].includes(batch.status)
      : batch.status === batchStatus);
    return keywordMatched && statusMatched;
  });
  const batchCounts = {
    draft: roleVisiblePayrollBatches.filter(batch => batch.status === "DRAFT").length,
    pending: roleVisiblePayrollBatches.filter(batch => batch.status === "PENDING").length,
    approved: roleVisiblePayrollBatches.filter(batch => ["CONFIRMED", "TRANSFER_EXPORTED"].includes(batch.status)).length,
    paid: roleVisiblePayrollBatches.filter(batch => batch.status === "PAID").length,
    rejected: roleVisiblePayrollBatches.filter(batch => batch.status === "REJECTED").length,
  };
  const payrollAmountTrend = useMemo(() => {
    const grouped = new Map<string, { sortKey: string; total: number; slips: number }>();
    for (const batch of allPayrollBatches.filter(item => {
      const approved = ["CONFIRMED", "TRANSFER_EXPORTED", "PAID"].includes(item.status);
      return approved && (chartGroupBy === "YEAR" || Number(item.period.slice(0, 4)) === chartYear);
    })) {
      const [year, month] = batch.period.split("-").map(Number);
      const quarter = Math.floor((month - 1) / 3) + 1;
      const key = chartGroupBy === "MONTH" ? `${String(month).padStart(2, "0")}/${year}`
        : chartGroupBy === "QUARTER" ? `Q${quarter}/${year}` : String(year);
      const sortKey = chartGroupBy === "MONTH" ? batch.period
        : chartGroupBy === "QUARTER" ? `${year}-${quarter}` : String(year);
      const current = grouped.get(key) || { sortKey, total: 0, slips: 0 };
      current.total += batch.totalAmount; current.slips += batch.slipCount;
      grouped.set(key, current);
    }
    return [...grouped.entries()].map(([periodLabel, value]) => ({
      period: periodLabel, sortKey: value.sortKey, total: value.total,
      average: value.slips ? value.total / value.slips : 0,
    })).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }, [allPayrollBatches, chartGroupBy, chartYear]);
  const amountByStatus = (statuses: SalaryStatusEnum[]) => roleVisiblePayrollBatches
    .filter(batch => statuses.includes(batch.status)).reduce((sum, batch) => sum + batch.totalAmount, 0);

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2 font-heading">
            <DollarSign className="h-6 w-6 text-primary" /> QUẢN LÝ BẢNG LƯƠNG
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Quản lý phiếu lương nhân sự, tính toán thù lao theo chấm công, phê duyệt và xác nhận thanh toán kỳ lương.
          </p>
        </div>

      </div>

      {viewMode === "DETAIL" && <div className="flex items-center justify-between rounded-xl border bg-card p-3"><div><p className="text-sm font-bold">Chi tiết bảng lương tháng {period.slice(5, 7)}/{period.slice(0, 4)}</p><p className="text-xs text-muted-foreground">Danh sách phiếu lương của nhân viên thuộc bảng đã chọn</p></div><Button variant="outline" size="sm" onClick={() => { payrollBatchRequestRef.current++; setViewMode("BATCHES"); setPeriodMode("ALL"); setPayrollBatches(allPayrollBatches); setSelectedIds([]); setSelectedSalary(null); setStatusFilter("ALL"); setDepartmentFilter("ALL"); setSalaryTypeFilter("ALL"); setKeywordInput(""); setBatchKeyword(""); setBatchStatus("ALL"); setCurrentPage(0); }} className="gap-1.5 text-xs"><ChevronLeft className="h-4 w-4" />Quay lại danh sách bảng lương</Button></div>}

      {viewMode === "BATCHES" && (
        <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Card className="p-4"><p className="text-xs text-muted-foreground">Bản nháp cần hoàn thiện</p><p className="mt-1 text-2xl font-black">{batchCounts.draft} bảng</p><p className="mt-1 text-xs text-muted-foreground">{formatVND(amountByStatus(["DRAFT"]))}</p></Card>
          <Card className="p-4 border-amber-500/20"><p className="text-xs text-muted-foreground">Đang chờ Admin duyệt</p><p className="mt-1 text-2xl font-black text-amber-600">{batchCounts.pending} bảng</p><p className="mt-1 text-xs text-muted-foreground">{formatVND(amountByStatus(["PENDING"]))} đang chờ xử lý</p></Card>
          <Card className="p-4 border-blue-500/20"><p className="text-xs text-muted-foreground">Đã duyệt, chưa hoàn tất</p><p className="mt-1 text-2xl font-black text-blue-600">{batchCounts.approved} bảng</p><p className="mt-1 text-xs text-muted-foreground">{formatVND(amountByStatus(["CONFIRMED", "TRANSFER_EXPORTED"]))}</p></Card>
          <Card className="p-4 border-emerald-500/20"><p className="text-xs text-muted-foreground">Đã thanh toán</p><p className="mt-1 text-2xl font-black text-emerald-600">{batchCounts.paid} bảng</p><p className="mt-1 text-xs text-muted-foreground">{formatVND(amountByStatus(["PAID"]))} đã chi</p></Card>
          <Card className="p-4 border-red-500/20"><p className="text-xs text-muted-foreground">Bị từ chối cần sửa</p><p className="mt-1 text-2xl font-black text-red-600">{batchCounts.rejected} bảng</p><p className="mt-1 text-xs text-muted-foreground">Cần chỉnh sửa và gửi lại</p></Card>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-sm font-bold">Phân tích lịch sử bảng lương</h2><p className="text-xs text-muted-foreground">So sánh toàn bộ dữ liệu giữa các kỳ, độc lập với bộ lọc danh sách</p></div><div className="flex items-center gap-2"><Select value={chartGroupBy} onValueChange={value => setChartGroupBy(value as typeof chartGroupBy)}><SelectTrigger className="h-9 w-40 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="MONTH">Theo tháng</SelectItem><SelectItem value="QUARTER">Theo quý</SelectItem><SelectItem value="YEAR">Theo năm</SelectItem></SelectContent></Select>{chartGroupBy !== "YEAR" && <div className="flex h-9 items-center rounded-lg border bg-background"><Button variant="ghost" size="sm" onClick={() => setChartYear(year => year - 1)} className="h-8 w-8 p-0" title="Năm trước"><ChevronLeft className="h-4 w-4" /></Button><Input type="number" min={2000} max={currentYear + 1} value={chartYear} onChange={event => setChartYear(Math.min(currentYear + 1, Math.max(2000, Number(event.target.value))))} className="h-8 w-20 border-0 text-center text-xs font-bold shadow-none" aria-label="Năm phân tích" /><Button variant="ghost" size="sm" onClick={() => setChartYear(year => Math.min(currentYear + 1, year + 1))} className="h-8 w-8 p-0" title="Năm sau"><ChevronRight className="h-4 w-4" /></Button></div>}</div></div>
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2"><CardHeader className="pb-2"><CardTitle className="text-sm">Tổng quỹ lương</CardTitle><CardDescription>So sánh tổng thực nhận {chartGroupBy === "MONTH" ? "giữa các tháng" : chartGroupBy === "QUARTER" ? "giữa các quý" : "giữa các năm"}</CardDescription></CardHeader><CardContent className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={payrollAmountTrend}><CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.25} /><XAxis dataKey="period" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 10 }} tickFormatter={value => `${Math.round(Number(value) / 1_000_000)}tr`} /><Tooltip formatter={value => formatVND(Number(value))} /><Bar dataKey="total" name="Quỹ lương" fill="var(--primary)" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Thực nhận bình quân</CardTitle><CardDescription>Bình quân mỗi nhân viên theo {chartGroupBy === "MONTH" ? "tháng" : chartGroupBy === "QUARTER" ? "quý" : "năm"}</CardDescription></CardHeader><CardContent className="h-64"><ResponsiveContainer width="100%" height="100%"><LineChart data={payrollAmountTrend}><CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.25} /><XAxis dataKey="period" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 10 }} tickFormatter={value => `${Math.round(Number(value) / 1_000_000)}tr`} /><Tooltip formatter={value => formatVND(Number(value))} /><Line type="monotone" dataKey="average" name="Bình quân" stroke="#8b5cf6" strokeWidth={2.5} dot={{ r: 3 }} /></LineChart></ResponsiveContainer></CardContent></Card>
        </div>
        <Card className="overflow-hidden border-border/60 shadow-xs">
          <CardHeader className="border-b bg-muted/10 py-4">
            <div className="flex items-center justify-between gap-3">
              <div><CardTitle className="text-base">{isAdmin ? "Bảng lương cần quản trị viên xử lý" : `Các bảng lương trong ${periodRange.label.toLowerCase()}`}</CardTitle><CardDescription className="mt-1 text-xs">{isAdmin ? "Chỉ hiển thị bảng lương HR đã gửi duyệt và các bảng đã được duyệt." : "Mỗi dòng là một bảng lương tháng. Mở bảng để kiểm tra các phiếu nhân viên trước khi gửi duyệt."}</CardDescription></div>
              <Button size="sm" onClick={() => setGenerateModalOpen(true)} className="gap-1.5 text-xs"><Calculator className="h-4 w-4" />Tạo bản nháp tháng</Button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <div className="relative min-w-64 flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={batchKeyword} onChange={event => setBatchKeyword(event.target.value)} placeholder="Tìm theo kỳ hoặc mã bảng lương..." className="h-9 pl-9 text-sm" /></div>
              <Select value={batchStatus} onValueChange={value => setBatchStatus(value as typeof batchStatus)}><SelectTrigger className="h-9 w-48 text-sm"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">Tất cả trạng thái</SelectItem><SelectItem value="DRAFT">Bản nháp</SelectItem><SelectItem value="PENDING">Chờ duyệt</SelectItem><SelectItem value="REJECTED">Bị từ chối</SelectItem><SelectItem value="APPROVED">Đã duyệt</SelectItem><SelectItem value="PAID">Đã thanh toán</SelectItem></SelectContent></Select>
              {(batchKeyword || batchStatus !== "ALL") && <Button variant="ghost" size="sm" onClick={() => { setBatchKeyword(""); setBatchStatus("ALL"); }} className="h-9 gap-1 text-xs"><X className="h-4 w-4" />Xóa lọc</Button>}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Kỳ lương</TableHead><TableHead>Trạng thái bảng</TableHead><TableHead>Ngày gửi</TableHead><TableHead>Ngày duyệt</TableHead><TableHead className="text-right">Số phiếu</TableHead><TableHead className="text-right">Tổng thực nhận</TableHead><TableHead className="text-right">Thao tác nghiệp vụ</TableHead></TableRow></TableHeader>
              <TableBody>
                {loadingBatches ? <TableRow><TableCell colSpan={7} className="h-32 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" /></TableCell></TableRow>
                : visiblePayrollBatches.length === 0 ? <TableRow><TableCell colSpan={7} className="h-40 text-center text-sm text-muted-foreground">{isAdmin ? "Không có bảng lương đang chờ duyệt hoặc đã duyệt trong kỳ này." : "Chưa có bảng lương thật trong kỳ đã chọn."}</TableCell></TableRow>
                : visiblePayrollBatches.map(batch => <TableRow key={batch.id}>
                  <TableCell><div className="font-bold">Tháng {batch.period.slice(5, 7)}/{batch.period.slice(0, 4)}</div><div className="text-[11px] text-muted-foreground">Mã bảng: PAYROLL-{batch.period}</div></TableCell>
                  <TableCell>{getStatusBadge(batch.status)}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{formatDateTime(batch.submittedAt)}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{formatDateTime(batch.approvedAt)}</TableCell>
                  <TableCell className="text-right font-semibold">{batch.slipCount}</TableCell>
                  <TableCell className="text-right font-mono font-bold">{formatVND(batch.totalAmount)}</TableCell>
                  <TableCell><div className="flex flex-col items-end gap-1.5"><div className="flex justify-end gap-1.5">
                    <Button variant="outline" size="sm" onClick={() => openPayroll(batch)} className="h-8 gap-1 text-xs"><Eye className="h-3.5 w-3.5" />Xem chi tiết</Button>
                    {batch.status === "DRAFT" && <><Button size="sm" onClick={() => submitPayroll(batch.period)} className="h-8 gap-1 text-xs"><Send className="h-3.5 w-3.5" />Gửi duyệt</Button>{isHr && batch.createdBy === String(auth.user?.id) && <Button variant="ghost" size="sm" onClick={() => setDraftToDelete(batch.period)} className="h-8 w-8 p-0 text-destructive" title="Xóa bản nháp của tôi"><Trash2 className="h-4 w-4" /></Button>}</>}
                    {isHr && batch.status === "PENDING" && batch.createdBy === String(auth.user?.id) && <><Button variant="outline" size="sm" onClick={() => cancelPayrollSubmission(batch.period)} className="h-8 gap-1 text-xs"><RotateCcw className="h-3.5 w-3.5" />Hủy chờ duyệt</Button><Button variant="ghost" size="sm" onClick={() => setDraftToDelete(batch.period)} className="h-8 w-8 p-0 text-destructive" title="Xóa bảng đang chờ duyệt của tôi"><Trash2 className="h-4 w-4" /></Button></>}
                    {isAdmin && batch.status === "PENDING" && <><Button variant="outline" size="sm" onClick={() => { setRejectingPeriod(batch.period); setRejectionReason(""); }} className="h-8 text-xs text-destructive">Từ chối</Button><Button size="sm" onClick={() => approvePayroll(batch.period)} className="h-8 gap-1 bg-blue-600 text-xs hover:bg-blue-700"><Check className="h-3.5 w-3.5" />Duyệt bảng lương</Button></>}
                    {batch.status === "REJECTED" && <Button size="sm" onClick={() => resubmitPayroll(batch.period)} className="h-8 gap-1 text-xs"><Send className="h-3.5 w-3.5" />Gửi lại</Button>}
                    {isAdmin && batch.status === "CONFIRMED" && <Button variant="outline" size="sm" onClick={() => handleExportTransferList(batch.period)} className="h-8 gap-1 text-xs"><DownloadCloud className="h-3.5 w-3.5" />Xuất chuyển khoản</Button>}
                    {isAdmin && batch.status === "TRANSFER_EXPORTED" && <Button size="sm" onClick={() => markPayrollPaid(batch.period)} className="h-8 gap-1 bg-emerald-600 text-xs hover:bg-emerald-700"><CreditCard className="h-3.5 w-3.5" />Đánh dấu đã thanh toán</Button>}
                    {isAdmin && <Button variant="ghost" size="sm" onClick={() => setApprovedToDelete(batch.period)} className="h-8 w-8 p-0 text-destructive" title="Xóa bảng lương"><Trash2 className="h-4 w-4" /></Button>}
                  </div>{batch.status === "REJECTED" && batch.rejectionReason && <p className="max-w-80 text-right text-[11px] text-destructive">Lý do: {batch.rejectionReason}</p>}</div></TableCell>
                </TableRow>)}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        </div>
      )}

      {viewMode === "DETAIL" && <>
      {/* KHU VỰC 1: METRIC CARDS (5 Card Ngang Hàng) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Card 1: Tổng chi lương kỳ này */}
        <Card className="p-4 rounded-xl border border-border/60 bg-card shadow-2xs hover:border-border transition-all">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Tổng chi lương kỳ này</span>
            <DollarSign className="h-4 w-4 text-primary" />
          </div>
          {loadingSummary ? (
            <Skeleton className="h-7 w-28 rounded-md" />
          ) : (
            <div>
              <div className="text-xl font-black text-foreground truncate">
                {formatVND(summaryData?.totalSalaryPaid)}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Tổng lương đã ghi nhận kỳ này</p>
            </div>
          )}
        </Card>

        {/* Card 2: Số phiếu lương */}
        <Card className="p-4 rounded-xl border border-border/60 bg-card shadow-2xs hover:border-border transition-all">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Số phiếu lương</span>
            <FileSpreadsheet className="h-4 w-4 text-blue-500" />
          </div>
          {loadingSummary ? (
            <Skeleton className="h-7 w-16 rounded-md" />
          ) : (
            <div>
              <div className="text-2xl font-black text-foreground">{summaryData?.totalSlips || 0}</div>
              <p className="text-[11px] text-muted-foreground mt-1">Tổng phiếu lương trong kỳ</p>
            </div>
          )}
        </Card>

        {false && <>{/* Card 3: Đang chờ duyệt (ẩn theo thiết kế chi tiết) */}
        <Card className="p-4 rounded-xl border border-amber-500/40 bg-amber-500/10 shadow-2xs hover:border-amber-500/60 transition-all">
          <div className="flex items-center justify-between text-amber-700 dark:text-amber-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Đang chờ duyệt</span>
            <Clock className="h-4 w-4 text-amber-500 animate-pulse" />
          </div>
          {loadingSummary ? (
            <Skeleton className="h-7 w-16 rounded-md" />
          ) : (
            <div>
              <div className="text-2xl font-black text-amber-700 dark:text-amber-400">
                {(summaryData?.pendingCount || 0) + (summaryData?.draftCount || 0)}{" "}
                <span className="text-xs font-normal opacity-80">phiếu</span>
              </div>
              <p className="text-[11px] text-amber-700/70 dark:text-amber-400/70 mt-1">
                Cần Admin kiểm tra & duyệt
              </p>
            </div>
          )}
        </Card>

        {/* Card 4: Đã duyệt, chưa thanh toán (LIGHT BLUE CARD) */}
        <Card className="p-4 rounded-xl border border-blue-500/30 bg-blue-500/10 shadow-2xs hover:border-blue-500/50 transition-all">
          <div className="flex items-center justify-between text-blue-600 dark:text-blue-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Đã duyệt chưa trả</span>
            <CheckCircle2 className="h-4 w-4 text-blue-500" />
          </div>
          {loadingSummary ? (
            <Skeleton className="h-7 w-16 rounded-md" />
          ) : (
            <div>
              <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
                {summaryData?.confirmedCount || 0} <span className="text-xs font-normal opacity-80">phiếu</span>
              </div>
              <p className="text-[11px] text-blue-600/70 dark:text-blue-400/70 mt-1">
                Sẵn sàng để xác nhận chi trả
              </p>
            </div>
          )}
        </Card>

        {/* Card 5: Đã thanh toán (GREEN CARD) */}
        <Card className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 shadow-2xs hover:border-emerald-500/50 transition-all">
          <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Đã thanh toán</span>
            <CreditCard className="h-4 w-4 text-emerald-500" />
          </div>
          {loadingSummary ? (
            <Skeleton className="h-7 w-16 rounded-md" />
          ) : (
            <div>
              <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
                {summaryData?.paidCount || 0} <span className="text-xs font-normal opacity-80">phiếu</span>
              </div>
              <p className="text-[11px] text-emerald-700/70 dark:text-emerald-400/70 mt-1">
                Hoàn tất giải ngân lương
              </p>
            </div>
          )}
        </Card>
        </>}
      </div>

      {/* KHU VỰC 2: CHARTS (2 Cột Donut + Bar Chart) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Chart 1: Donut "Phân bổ theo trạng thái" (Col 5) */}
        {false && <Card className="lg:col-span-5 p-4 rounded-xl border border-border/60 bg-card shadow-2xs space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-primary" /> Phân bổ theo trạng thái phiếu lương
          </h3>
          <div className="h-[200px] w-full flex items-center justify-center">
            {loadingSummary ? (
              <Skeleton className="h-full w-full rounded-xl" />
            ) : pieData.every((d) => d.value === 0) ? (
              <div className="text-xs text-muted-foreground text-center">Chưa có dữ liệu kỳ này</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.key} fill={STATUS_COLORS[entry.key] || "#8884d8"} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: any) => [`${val} phiếu`, "Số lượng"]} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          {/* Legend */}
          <div className="flex flex-wrap justify-center gap-4 text-xs pt-1 border-t border-border/30">
            {pieData.map((item) => (
              <div key={item.key} className="flex items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: STATUS_COLORS[item.key] || "#8884d8" }}
                ></span>
                <span className="text-muted-foreground font-medium">{item.name}:</span>
                <span className="font-bold text-foreground">{item.value}</span>
              </div>
            ))}
          </div>
        </Card>}

        {/* Chart 2: Bar "Tổng chi lương theo phòng ban" (Col 7) */}
        <Card className="lg:col-span-12 p-4 rounded-xl border border-border/60 bg-card shadow-2xs space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Building2 className="h-4 w-4 text-blue-500" /> Tổng chi lương theo phòng ban · {periodRange.label}
          </h3>
          <div className="h-[200px] w-full">
            {loadingSummary ? (
              <Skeleton className="h-full w-full rounded-xl" />
            ) : deptBarData.length === 0 ? (
              <div className="text-xs text-muted-foreground text-center py-16">Chưa có dữ liệu phòng ban</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptBarData} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(150,150,150,0.15)" />
                  <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={120} />
                  <Tooltip
                    formatter={(val: any) => [formatVND(Number(val)), "Tổng lương"]}
                    contentStyle={{ borderRadius: "8px", fontSize: "12px" }}
                  />
                  <Bar dataKey="total" fill="#3b82f6" radius={[0, 6, 6, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      {/* Chart Line Xu Hướng 6 Kỳ (Tùy chọn hiển thị nếu có dữ liệu) */}
      {false && (summaryData?.historicalTrend?.length ?? 0) > 0 && (
        <Card className="p-4 rounded-xl border border-border/60 bg-card shadow-2xs space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4 text-emerald-500" /> Xu hướng chi trả lương 6 kỳ gần nhất
          </h3>
          <div className="h-[160px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={summaryData?.historicalTrend ?? []} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(150,150,150,0.15)" />
                <XAxis dataKey="periodLabel" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(val: any) => [formatVND(Number(val)), "Tổng chi lương"]} />
                <Line type="monotone" dataKey="totalSalary" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* KHU VỰC 3: CARD BẢNG DANH SÁCH PHIẾU LƯƠNG (RoleManagement Style) */}
      <Card className="border-border shadow-sm bg-card overflow-hidden">
        {/* Header & Main Actions */}
        <CardHeader className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-border/30 bg-card">
          <div>
            <CardTitle className="text-xl font-semibold tracking-tight font-heading flex items-center gap-2">
              <span>Danh sách phiếu lương · {periodRange.label}</span>
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground mt-0.5">
              Rà soát thông tin thu nhập, thưởng, khấu trừ và tiến độ thanh toán của nhân sự.
            </CardDescription>
          </div>
        </CardHeader>

        {/* UNIFIED FILTER & SEARCH TOOLBAR FORM */}
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

          {/* Trạng thái Filter */}
          <div className="flex flex-col gap-1 w-44 shrink-0">
            <Label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Trạng thái</Label>
            <Select
              value={statusFilter}
              onValueChange={(val) => {
                setStatusFilter(val as SalaryStatusEnum | "ALL");
                setCurrentPage(0);
              }}
            >
              <SelectTrigger className="h-9 text-sm border border-border/30 bg-background rounded-lg w-full">
                <SelectValue placeholder="Tất cả trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
                <SelectItem value="DRAFT">Nháp (DRAFT)</SelectItem>
                <SelectItem value="PENDING">Chờ duyệt (PENDING)</SelectItem>
                <SelectItem value="CONFIRMED">Đã duyệt (CONFIRMED)</SelectItem>
                <SelectItem value="TRANSFER_EXPORTED">Đã xuất chuyển khoản</SelectItem>
                <SelectItem value="PAID">Đã thanh toán (PAID)</SelectItem>
              </SelectContent>
            </Select>
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

          {/* Hình thức tính lương Filter */}
          <div className="flex flex-col gap-1 w-44 shrink-0">
            <Label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Hình thức</Label>
            <Select
              value={salaryTypeFilter}
              onValueChange={(val) => {
                setSalaryTypeFilter(val as SalaryTypeEnum | "ALL");
                setCurrentPage(0);
              }}
            >
              <SelectTrigger className="h-9 text-sm border border-border/30 bg-background rounded-lg w-full">
                <SelectValue placeholder="Tất cả hình thức" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả hình thức</SelectItem>
                <SelectItem value="MONTHLY">Cố định tháng</SelectItem>
                <SelectItem value="DAILY">Theo ngày</SelectItem>
                <SelectItem value="HOURLY">Theo giờ</SelectItem>
              </SelectContent>
            </Select>
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

        {/* BULK ACTION TOOLBAR */}
        {isAdmin && selectedIds.length > 0 && (
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-primary/10 border-b border-primary/20 text-xs animate-in fade-in-50 duration-200">
            <div className="flex items-center gap-2 font-bold text-primary">
              <CheckCircle2 className="h-4 w-4" />
              <span>Đã chọn {selectedIds.length} phiếu lương</span>
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
                <span>Bỏ chọn</span>
              </Button>

              <Button
                onClick={handleBulkApprove}
                disabled={bulkActionLoading || !canApproveSelection}
                title={!canApproveSelection ? "Chỉ phiếu Chờ duyệt mới được Admin duyệt" : undefined}
                size="sm"
                className="h-7 text-xs font-semibold gap-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-xs"
              >
                {bulkActionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                Duyệt hàng loạt ({selectedIds.length})
              </Button>

              <Button
                onClick={() => setConfirmBulkPayOpen(true)}
                disabled={bulkActionLoading || !canPaySelection}
                title={!canPaySelection ? "Phải xuất danh sách chuyển khoản trước khi xác nhận thanh toán" : undefined}
                size="sm"
                className="h-7 text-xs font-semibold gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs"
              >
                {bulkActionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CreditCard className="h-3.5 w-3.5" />}
                Đánh dấu đã thanh toán ({selectedIds.length})
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
                    checked={salaries.length > 0 && selectedIds.length === salaries.length}
                    onCheckedChange={(checked) => handleSelectAll(!!checked)}
                    className="translate-y-0.5 border-border/30"
                  />
                </TableHead>
                <TableHead className="pb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Kỳ lương</TableHead>
                <TableHead className="pb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Nhân viên
                </TableHead>
                <TableHead className="pb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Phòng ban
                </TableHead>
                <TableHead className="pb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Hình thức
                </TableHead>
                <TableHead className="pb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">
                  Lương cơ bản
                </TableHead>
                <TableHead className="pb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">
                  Thưởng
                </TableHead>
                <TableHead className="pb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">
                  Khấu trừ
                </TableHead>
                <TableHead className="pb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">
                  Thực nhận
                </TableHead>
                <TableHead className="pb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground text-center">
                  Trạng thái
                </TableHead>
                <TableHead className="pb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">
                  Thao tác
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody className="opacity-90">
              {salaries.length === 0 && !loadingList ? (
                <TableRow>
                  <TableCell colSpan={11} className="py-16 text-center text-muted-foreground text-sm">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Calculator className="h-10 w-10 text-muted-foreground/40" />
                      <div className="space-y-1">
                        <p className="font-semibold text-foreground">{periodRange.label} chưa có phiếu lương phù hợp</p>
                        <p className="text-xs text-muted-foreground">
                          Bấm nút <b>"Tạo bảng lương kỳ mới"</b> phía trên để tự động sinh phiếu lương DRAFT cho toàn bộ nhân sự.
                        </p>
                      </div>
                      {isHr && periodMode === "MONTH" && <Button
                        size="sm"
                        onClick={() => setGenerateModalOpen(true)}
                        className="mt-2 text-xs font-bold gap-1.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer"
                      >
                        <Calculator className="h-4 w-4" /> Tạo bảng lương tháng {period}
                      </Button>}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                salaries.map((item) => {
                  const isSelected = selectedIds.includes(item.id);
                  const isNegativeOrZero = item.totalSalary <= 0;

                  return (
                    <TableRow
                      key={item.id}
                      className={`transition-colors border-b border-border/30 hover:bg-muted/30 cursor-pointer text-xs ${
                        isSelected ? "bg-primary/5 font-medium" : ""
                      }`}
                      onClick={() => {
                        setSelectedSalary(item);
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

                      <TableCell className="whitespace-nowrap font-semibold">{item.period}</TableCell>

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
                              {item.employeeCode || "N/A"}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      {/* Cột Phòng ban */}
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {item.departmentName || "Chưa xếp"}
                      </TableCell>

                      {/* Cột Hình thức */}
                      <TableCell className="whitespace-nowrap">
                        {getSalaryTypeBadge(item.salaryTypeEnum)}
                      </TableCell>

                      {/* Cột Lương cơ bản */}
                      <TableCell className="text-right font-mono text-muted-foreground whitespace-nowrap">
                        {formatVND(item.baseSalary)}
                      </TableCell>

                      {/* Cột Thưởng */}
                      <TableCell className="text-right font-mono text-emerald-600 font-medium whitespace-nowrap">
                        +{formatVND(item.bonus)}
                      </TableCell>

                      {/* Cột Khấu trừ */}
                      <TableCell className="text-right font-mono text-red-600 font-medium whitespace-nowrap">
                        -{formatVND(item.deduction)}
                      </TableCell>

                      {/* Cột THỰC NHẬN (CỠ CHỮ LỚN, IN ĐẬM) */}
                      <TableCell className="text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {isNegativeOrZero && (
                            <span title="Tổng lương bất thường"><AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" /></span>
                          )}
                          <span className="font-mono text-sm font-black text-primary">
                            {formatVND(item.totalSalary)}
                          </span>
                        </div>
                      </TableCell>

                      {/* Cột Trạng thái */}
                      <TableCell className="text-center whitespace-nowrap">
                        {getStatusBadge(item.status)}
                      </TableCell>

                      {/* Cột Thao tác */}
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedSalary(item);
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

        {/* PAGINATION FOOTER */}
        <CardFooter className="px-4 py-3 border-t border-border/30 bg-card flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="text-muted-foreground">
            Hiển thị <b>{salaries.length}</b> / <b>{totalElements}</b> phiếu lương trong {periodRange.label.toLowerCase()}
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
      </>}

      {/* Modal Tạo Bảng Lương Kỳ Mới */}
      <GenerateSalaryModal
        isOpen={generateModalOpen}
        onClose={() => setGenerateModalOpen(false)}
        defaultPeriod={period}
        onSuccess={(msg) => {
          showBanner(msg);
          fetchSummary();
          fetchList();
          fetchPayrollBatches();
        }}
      />

      {/* Drawer Chi Tiết Phiếu Lương */}
      <SalaryDetailDrawer
        salary={selectedSalary}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onRefresh={() => {
          fetchSummary();
          fetchList();
        }}
        onActionSuccess={(msg) => showBanner(msg)}
        canApprove={isAdmin}
        canMarkPaid={isAdmin}
        canEdit={isHr || isAdmin}
      />

      {/* Dialog Xác Nhận Thanh Toán Hàng Loạt */}
      <ConfirmDialog
        open={confirmBulkPayOpen}
        onOpenChange={setConfirmBulkPayOpen}
        title="XÁC NHẬN THANH TOÁN HÀNG LOẠT"
        description={`Bạn có chắc chắn muốn XÁC NHẬN THANH TOÁN HÀNG LOẠT ${selectedIds.length} phiếu lương đã chọn? Hành động này sẽ chuyển trạng thái các phiếu lương sang PAID và không thể hoàn tác.`}
        variant="warning"
        confirmText="Xác nhận thanh toán"
        onConfirm={handleBulkMarkPaid}
      />
      <Dialog open={!!rejectingPeriod} onOpenChange={open => { if (!open) { setRejectingPeriod(null); setRejectionReason(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Từ chối bảng lương</DialogTitle><DialogDescription>Lý do sẽ được gửi cho HR qua email và thông báo trong hệ thống.</DialogDescription></DialogHeader>
          <div className="space-y-2"><Label>Lý do từ chối <span className="text-destructive">*</span></Label><textarea value={rejectionReason} onChange={event => setRejectionReason(event.target.value)} maxLength={500} placeholder="Nêu rõ nội dung HR cần chỉnh sửa..." className="min-h-28 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20" /><p className="text-right text-[11px] text-muted-foreground">{rejectionReason.length}/500</p></div>
          <DialogFooter><Button variant="outline" onClick={() => setRejectingPeriod(null)}>Hủy</Button><Button variant="destructive" disabled={rejectionReason.trim().length < 5} onClick={rejectPayroll}>Từ chối và thông báo HR</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={!!draftToDelete}
        onOpenChange={(open) => { if (!open) setDraftToDelete(null); }}
        title="CHUYỂN BẢNG LƯƠNG VÀO THÙNG RÁC"
        description={`Chuyển toàn bộ phiếu lương tháng ${draftToDelete || ""} do bạn tạo vào thùng rác?`}
        variant="destructive"
        confirmText="Chuyển vào thùng rác"
        onConfirm={deleteDraftPayroll}
      />
      <ConfirmDialog
        open={!!approvedToDelete}
        onOpenChange={open => { if (!open) setApprovedToDelete(null); }}
        title="CHUYỂN BẢNG LƯƠNG VÀO THÙNG RÁC"
        description={`Chuyển toàn bộ phiếu thuộc bảng lương tháng ${approvedToDelete || ""} vào thùng rác? Admin có thể khôi phục hoặc xóa vĩnh viễn sau.`}
        variant="destructive"
        confirmText="Chuyển vào thùng rác"
        onConfirm={deleteApprovedPayroll}
      />
    </div>
  );
};
