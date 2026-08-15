import React, { useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { DatePickerInput, formatDateDisplay } from "@/components/ui/DatePickerInput";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  Building2,
  Plus,
  Search,
  Trash2,
  Edit,
  CheckCircle2,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Eye,
  Users,
  Briefcase,
  BarChart3,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  RefreshCw,
  ArrowRightLeft,
  CalendarDays,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  Legend,
} from "recharts";

import { departmentApi, type DepartmentResponse } from "@/api/departments/departmentApi";
import { DepartmentDetailModal } from "@/components/admin/department/DepartmentDetailModal";
import { UnassignedEmployeesModal } from "@/components/admin/department/UnassignedEmployeesModal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

const DEPT_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--primary)",
  "var(--color-brand-cobalt)",
];
const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - i);

/**
 * Lấy danh sách số trang hiển thị phân trang
 */
const getPageNumbers = (currentPage: number, total: number) => {
  const pages: (number | string)[] = [];
  if (total <= 7) {
    for (let i = 0; i < total; i++) pages.push(i);
  } else {
    pages.push(0);
    if (currentPage > 2) pages.push("...");
    const start = Math.max(1, currentPage - 1);
    const end = Math.min(total - 2, currentPage + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (currentPage < total - 3) pages.push("...");
    pages.push(total - 1);
  }
  return pages;
};

// --- Zod Schema (giống RoleManagement) ---
const deptSchema = z.object({
  name: z.string().min(1, "Tên Phòng ban không được để trống").max(255, "Tối đa 255 ký tự"),
  description: z.string().max(3000, "Tối đa 3000 ký tự").optional(),
});
type DeptFormValues = z.infer<typeof deptSchema>;

// Schema cho edit (có thêm status)
const deptEditSchema = z.object({
  name: z.string().min(1, "Tên Phòng ban không được để trống").max(255, "Tối đa 255 ký tự"),
  description: z.string().max(3000, "Tối đa 3000 ký tự").optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});
type DeptEditFormValues = z.infer<typeof deptEditSchema>;

export const DepartmentManagement: React.FC = () => {
  const location = useLocation();

  // Data States
  const [departments, setDepartments] = useState<DepartmentResponse[]>([]);
  const [selectedDeptIds, setSelectedDeptIds] = useState<string[]>([]);

  // Overview Stats States
  const [totalDepartments, setTotalDepartments] = useState<number>(0);
  const [activeDepartments, setActiveDepartments] = useState<number>(0);
  const [emptyDepartments, setEmptyDepartments] = useState<number>(0);
  const [countEmployeeNotDepartment, setCountEmployeeNotDepartment] = useState<number>(0);
  const [unassignedModalOpen, setUnassignedModalOpen] = useState<boolean>(false);

  const [employeesByDeptData, setEmployeesByDeptData] = useState<{ name: string; value: number }[]>([]);
  const [typeBreakdownData, setTypeBreakdownData] = useState<{ name: string; fullTime: number; partTime: number }[]>([]);
  const [chartYear, setChartYear] = useState<string>("ALL");

  // Filter & Search
  const [searchKeyword, setSearchKeyword] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterHasEmployees, setFilterHasEmployees] = useState<string>("ALL");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");

  // Multi-column sorting
  const [sortRules, setSortRules] = useState<{ field: string; dir: "ASC" | "DESC" }[]>([
    { field: "id", dir: "DESC" },
  ]);

  // Pagination
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [jumpPageInput, setJumpPageInput] = useState<string>("1");

  // Helper thay đổi trang đồng bộ với input
  const changePage = (newPage: number) => {
    setPage(newPage);
    setJumpPageInput(String(newPage + 1));
  };

  // Loading States
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState(false);
  const [tableError, setTableError] = useState("");
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Toast Banners
  const [successBanner, setSuccessBanner] = useState("");
  const [errorBanner, setErrorBanner] = useState("");
  const [newlyCreatedId, setNewlyCreatedId] = useState<string | null>(null);
  const [actionBanner, setActionBanner] = useState<{
    message: string;
    actionText?: string;
    onAction?: () => void;
  } | null>(null);

  /**
   * Hiển thị thông báo banner tạm thời
   */
  const showBanner = (msg: string, isError = false) => {
    if (isError) {
      setErrorBanner(msg);
      setTimeout(() => { setErrorBanner(""); }, 3500);
    } else {
      setSuccessBanner(msg);
      setTimeout(() => { setSuccessBanner(""); }, 3500);
    }
  };

  /**
   * Kiểm tra bản ghi phòng ban có khớp với các tiêu chí lọc hay không
   */
  const doesDeptMatchFilters = (d: DepartmentResponse): boolean => {
    if (!d) return false;
    if (filterStatus !== "ALL") {
      if (d.status !== filterStatus) return false;
    }
    if (filterHasEmployees !== "ALL") {
      const hasEmp = (d.employeeCount ?? 0) > 0;
      if (hasEmp !== (filterHasEmployees === "TRUE")) return false;
    }
    if (searchKeyword.trim()) {
      const kw = searchKeyword.trim().toLowerCase();
      const nameMatch = Boolean(d.name.toLowerCase().includes(kw));
      const codeMatch = Boolean(d.code.toLowerCase().includes(kw));
      const descMatch = d.description ? d.description.toLowerCase().includes(kw) : false;
      if (!nameMatch && !codeMatch && !descMatch) return false;
    }
    if (filterStartDate && d.createdAt && d.createdAt.slice(0, 10) < filterStartDate) {
      return false;
    }
    if (filterEndDate && d.createdAt && d.createdAt.slice(0, 10) > filterEndDate) {
      return false;
    }
    return true;
  };

  // Sticky Sub-navbar
  const [activeSubTab, setActiveSubTab] = useState<"statistics" | "management">(() => {
    return location.hash === "#management" ? "management" : "statistics";
  });

  /**
   * Cuộn trang mượt tới section chỉ định
   */
  const scrollToSection = (sectionId: "statistics" | "management") => {
    setActiveSubTab(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      const offset = 130;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;
      window.scrollTo({ top: offsetPosition, behavior: "smooth" });
    }
  };

  // Department Detail Modal
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedDeptForDetail, setSelectedDeptForDetail] = useState<DepartmentResponse | null>(null);
  const [detailModalTab, setDetailModalTab] = useState<string>("general");

  // Create/Edit Modal
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<DepartmentResponse | null>(null);

  // Forms
  const createForm = useForm<DeptFormValues>({
    resolver: zodResolver(deptSchema),
    defaultValues: { name: "", description: "" },
  });

  const editForm = useForm<DeptEditFormValues>({
    resolver: zodResolver(deptEditSchema),
    defaultValues: { name: "", description: "", status: "ACTIVE" },
  });

  // API Calls
  /**
   * Lấy thống kê tổng quan và số liệu biểu đồ phòng ban
   */
  const fetchOverviewStats = useCallback(async () => {
    setStatsLoading(true);
    setStatsError(false);
    try {
      const year = chartYear !== "ALL" ? Number(chartYear) : undefined;
      const data = await departmentApi.getOverviewStats(year);

      setTotalDepartments(Number(data.totalDepartments) || 0);
      setActiveDepartments(Number(data.activeDepartments) || 0);
      setEmptyDepartments(Number(data.emptyDepartments) || 0);
      setCountEmployeeNotDepartment(Number(data.countEmployeeNotDepartment) || 0);

      if (data.employeesByDepartment) {
        setEmployeesByDeptData(
          Object.entries(data.employeesByDepartment)
            .map(([name, value]) => ({ name, value: Number(value) || 0 }))
            .sort((a, b) => b.value - a.value)
        );
      } else {
        setEmployeesByDeptData([]);
      }

      if (data.employmentTypeBreakdown && data.employmentTypeBreakdown.length > 0) {
        const grouped: Record<string, { fullTime: number; partTime: number }> = {};
        data.employmentTypeBreakdown.forEach((item) => {
          if (!grouped[item.deptName]) grouped[item.deptName] = { fullTime: 0, partTime: 0 };
          const cnt = Number(item.count) || 0;
          if (item.employmentType === "FULL_TIME") grouped[item.deptName].fullTime += cnt;
          else if (item.employmentType === "PART_TIME") grouped[item.deptName].partTime += cnt;
        });
        setTypeBreakdownData(
          Object.entries(grouped).map(([name, v]) => ({ name, fullTime: v.fullTime, partTime: v.partTime }))
        );
      } else {
        setTypeBreakdownData([]);
      }
    } catch (err: unknown) {
      console.error("Lỗi lấy thống kê Phòng ban:", err);
      setStatsError(true);
    } finally {
      setStatsLoading(false);
    }
  }, [chartYear]);

  /**
   * Lấy danh sách phòng ban có phân trang, tìm kiếm và sắp xếp
   */
  const fetchDepartments = useCallback(async () => {
    setLoading(true);
    setTableError("");
    try {
      const sortParams = sortRules.length > 0
        ? sortRules.map(r => `${r.field}:${r.dir.toLowerCase()}`)
        : ["id:desc"];
      const params: Record<string, unknown> = {
        page,
        size: pageSize,
        sort: sortParams,
        keyword: searchKeyword.trim() || undefined,
      };
      if (filterStatus !== "ALL") params.status = filterStatus;
      if (filterHasEmployees !== "ALL") params.hasEmployees = filterHasEmployees === "TRUE";
      if (filterStartDate) params.createdFrom = `${filterStartDate}T00:00:00`;
      if (filterEndDate) params.createdTo = `${filterEndDate}T23:59:59`;

      const res = await departmentApi.searchDepartments(params);

      if (res.data.success && res.data.data.content) {
        const pageData = res.data.data;
        setDepartments(pageData.content);
        setTotalPages(pageData.totalPages);
        setTotalElements(pageData.totalElements);
      } else {
        setDepartments([]);
        setTotalPages(1);
        setTotalElements(0);
        setTableError(res.data.message ?? "Không thể tải danh sách phòng ban.");
      }
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } }; message?: string };
      const errMsg = errorObj.response?.data?.message ?? errorObj.message ?? "Lỗi kết nối máy chủ. Vui lòng thử lại!";
      setTableError(errMsg);
      setDepartments([]);
      setTotalPages(1);
      setTotalElements(0);
    } finally {
      setLoading(false);
    }
  }, [filterEndDate, filterHasEmployees, filterStartDate, filterStatus, page, pageSize, searchKeyword, sortRules]);

  // Effects
  useEffect(() => {
    void fetchOverviewStats();
  }, [fetchOverviewStats]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchDepartments();
    }, 300);
    return () => {
      clearTimeout(timer);
    };
  }, [fetchDepartments]);

  // Handlers
  /**
   * Xử lý submit form tìm kiếm phòng ban
   */
  const handleSearchSubmit = (e: React.SyntheticEvent) => {
    e.preventDefault();
    changePage(0);
    void fetchDepartments();
  };

  /**
   * Đặt lại tất cả các điều kiện lọc về mặc định
   */
  const handleResetFilters = () => {
    setSearchKeyword("");
    setFilterStatus("ALL");
    setFilterHasEmployees("ALL");
    setFilterStartDate("");
    setFilterEndDate("");
    setSortRules([{ field: "id", dir: "DESC" }]);
    changePage(0);
  };

  /**
   * Xử lý sắp xếp đa cột (multi-column sort)
   */
  const handleSort = (field: string) => {
    setSortRules(prevRules => {
      const existingIndex = prevRules.findIndex(r => r.field === field);

      if (existingIndex === -1) {
        const filtered = prevRules.filter(r => r.field !== "id");
        return [...filtered, { field, dir: "ASC" }];
      } else {
        const currentRule = prevRules[existingIndex];
        if (currentRule.dir === "ASC") {
          const updated = [...prevRules];
          updated[existingIndex] = { field, dir: "DESC" };
          return updated;
        } else {
          const updated = prevRules.filter(r => r.field !== field);
          return updated.length === 0 ? [{ field: "id", dir: "DESC" }] : updated;
        }
      }
    });
    changePage(0);
  };

  /**
   * Lấy thông tin thứ tự và hướng sắp xếp của cột
   */
  const getSortRuleInfo = (field: string) => {
    const idx = sortRules.findIndex(r => r.field === field);
    if (idx === -1) return null;
    return { priority: idx + 1, dir: sortRules[idx].dir };
  };

  /**
   * Render icon hiển thị hướng và ưu tiên sắp xếp
   */
  const renderSortIcon = (field: string) => {
    const info = getSortRuleInfo(field);
    if (!info) return <ArrowUpDown className="h-3.5 w-3.5 opacity-40 group-hover:opacity-100" />;
    return (
      <span className="flex items-center gap-0.5 text-primary font-bold text-xs">
        {info.dir === "ASC" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}
        {sortRules.length > 1 && <span className="text-[10px]">{info.priority}</span>}
      </span>
    );
  };

  /**
   * Chọn hoặc bỏ chọn tất cả phòng ban
   */
  const handleSelectAll = (checked: boolean) => {
    if (checked) setSelectedDeptIds(departments.map(d => d.id));
    else setSelectedDeptIds([]);
  };

  /**
   * Chọn hoặc bỏ chọn một phòng ban cụ thể
   */
  const handleSelectDept = (id: string) => {
    if (selectedDeptIds.includes(id)) setSelectedDeptIds(selectedDeptIds.filter(i => i !== id));
    else setSelectedDeptIds([...selectedDeptIds, id]);
  };

  /**
   * Mở modal xem chi tiết phòng ban
   */
  const handleOpenDetailModal = (dept: DepartmentResponse, initialTab = "general") => {
    setSelectedDeptForDetail(dept);
    setDetailModalTab(initialTab);
    setDetailModalOpen(true);
  };

  /**
   * Mở modal tạo mới phòng ban
   */
  const handleOpenCreateModal = () => {
    setEditingDept(null);
    createForm.reset({ name: "", description: "" });
    setFormModalOpen(true);
  };

  /**
   * Mở modal chỉnh sửa phòng ban
   */
  const handleOpenEditModal = (dept: DepartmentResponse) => {
    setEditingDept(dept);
    editForm.reset({
      name: dept.name,
      description: dept.description ?? "",
      status: dept.status,
    });
    setFormModalOpen(true);
  };

  /**
   * Đóng modal form thêm/sửa phòng ban
   */
  const handleCloseFormModal = () => {
    setFormModalOpen(false);
    setEditingDept(null);
    createForm.reset({ name: "", description: "" });
    editForm.reset({ name: "", description: "", status: "ACTIVE" });
  };

  /**
   * Lưu thông tin tạo mới hoặc cập nhật phòng ban
   */
  const handleSaveDepartment = async (values: DeptFormValues | DeptEditFormValues) => {
    setFormSubmitting(true);
    try {
      if (editingDept) {
        const v = values as DeptEditFormValues;
        await departmentApi.updateDepartment(editingDept.id, {
          name: v.name.trim(),
          description: (v.description ?? "").trim(),
          status: v.status,
        });
        showBanner("Cập nhật Phòng ban thành công!");
        handleCloseFormModal();
        void fetchDepartments();
        void fetchOverviewStats();
      } else {
        const v = values as DeptFormValues;
        const res = await departmentApi.createDepartment({
          name: v.name.trim(),
          description: (v.description ?? "").trim(),
        });
        const newDept = res.data.data;
        if (newDept && newDept.id) {
          const isMatch = doesDeptMatchFilters(newDept);
          if (isMatch) {
            setNewlyCreatedId(newDept.id);
            setDepartments(prev => [newDept, ...prev.filter(d => d.id !== newDept.id)]);
            setTotalElements(prev => prev + 1);
            showBanner(`Tạo mới Phòng ban "${newDept.name}" thành công!`);
            setTimeout(() => { setNewlyCreatedId(null); }, 3500);
          } else {
            setActionBanner({
              message: `Đã tạo mới Phòng ban "${newDept.name}" thành công.`,
              actionText: "Xem bản ghi này",
              onAction: () => {
                handleResetFilters();
                setNewlyCreatedId(newDept.id);
                setDepartments(prev => [newDept, ...prev.filter(d => d.id !== newDept.id)]);
                scrollToSection("management");
                setActionBanner(null);
                setTimeout(() => { setNewlyCreatedId(null); }, 4000);
              },
            });
            setTimeout(() => { setActionBanner(null); }, 7000);
          }
        } else {
          void fetchDepartments();
        }
        handleCloseFormModal();
        void fetchOverviewStats();
      }
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } }; message?: string };
      showBanner(errorObj.response?.data?.message ?? errorObj.message ?? "Lỗi lưu Phòng ban", true);
    } finally {
      setFormSubmitting(false);
    }
  };

  const [deleteConfirmDeptId, setDeleteConfirmDeptId] = useState<string | number | null>(null);

  /**
   * Mở dialog xác nhận xóa phòng ban
   */
  const handleDeleteDepartment = (deptId: string | number) => {
    setDeleteConfirmDeptId(deptId);
  };

  /**
   * Thực hiện gọi API xóa phòng ban sau khi xác nhận
   */
  const confirmDeleteDepartment = async () => {
    if (!deleteConfirmDeptId) return;
    try {
      await departmentApi.deleteDepartment(String(deleteConfirmDeptId));
      showBanner("Xóa Phòng ban thành công!");
      if (detailModalOpen) setDetailModalOpen(false);
      void fetchDepartments();
      void fetchOverviewStats();
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } }; message?: string };
      showBanner(errorObj.response?.data?.message ?? errorObj.message ?? "Không thể xóa Phòng ban còn nhân viên đang gán!", true);
    } finally {
      setDeleteConfirmDeptId(null);
    }
  };

  // --- Render ---
  return (
    <div className="mx-auto max-w-none w-full px-4 sm:px-6 lg:px-10 py-6 space-y-8 animate-in fade-in-50 duration-300">

      {/* Toast Banners */}
      {actionBanner && (
        <div className="fixed bottom-6 right-6 z-9999 flex items-center gap-3 rounded-2xl bg-emerald-600 text-white px-5 py-3.5 shadow-2xl animate-in slide-in-from-bottom-5 duration-300">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-100" />
          <div className="flex items-center gap-3 flex-wrap text-sm font-semibold">
            <span>{actionBanner.message}</span>
            {actionBanner.actionText && actionBanner.onAction && (
              <button
                onClick={actionBanner.onAction}
                className="underline font-bold text-amber-200 hover:text-white transition-colors cursor-pointer bg-white/20 px-2.5 py-1 rounded-xl text-xs flex items-center gap-1 shadow-xs"
              >
                <span>[{actionBanner.actionText}]</span>
              </button>
            )}
          </div>
        </div>
      )}
      {successBanner && (
        <div className="fixed bottom-6 right-6 z-9999 flex items-center gap-3 rounded-2xl bg-emerald-600 text-white px-5 py-3.5 shadow-2xl animate-in slide-in-from-bottom-5 duration-300">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span className="text-sm font-semibold">{successBanner}</span>
        </div>
      )}
      {errorBanner && (
        <div className="fixed bottom-6 right-6 z-9999 flex items-center gap-3 rounded-2xl bg-red-600 text-white px-5 py-3.5 shadow-2xl animate-in slide-in-from-bottom-5 duration-300">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span className="text-sm font-semibold">{errorBanner}</span>
        </div>
      )}

      {/* Page Title Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/30 pb-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground flex items-center gap-3 mt-2">
            <div className="p-2.5 rounded-2xl bg-primary/10 text-primary">
              <Building2 className="h-7 w-7" />
            </div>
            <span>Quản lý Phòng ban</span>
          </h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button onClick={() => { void fetchDepartments(); }} variant="outline" size="sm" className="rounded-xl gap-1.5 font-semibold">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Làm mới
          </Button>
          <Button onClick={handleOpenCreateModal} size="sm" className="rounded-xl gap-1 font-semibold bg-primary text-primary-foreground">
            <Plus className="h-4 w-4" /> Thêm Phòng ban mới
          </Button>
        </div>
      </div>

      {/* STICKY SUB-NAVBAR */}
      <div className="sticky top-16 bg-card/85 backdrop-blur-md border-b border-border/30 z-30 shadow-xs -mx-4 sm:-mx-6 lg:-mx-10 px-4 sm:px-6 lg:px-10 transition-all duration-200">
        <div className="flex items-center justify-between h-12">
          <div className="flex gap-6 md:gap-8 h-full items-center text-base font-semibold">
            <button
              onClick={() => { scrollToSection("statistics"); }}
              className={`flex items-center gap-2 h-full border-b-2 transition-colors cursor-pointer ${
                activeSubTab === "statistics" ? "border-primary text-primary font-extrabold" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              <span>Thống kê &amp; Phân tích</span>
            </button>
            <button
              onClick={() => { scrollToSection("management"); }}
              className={`flex items-center gap-2 h-full border-b-2 transition-colors cursor-pointer ${
                activeSubTab === "management" ? "border-primary text-primary font-extrabold" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Building2 className="h-4 w-4" />
              <span>Danh sách Phòng ban</span>
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 1: OVERVIEW */}
      <section id="statistics" className="space-y-8 scroll-mt-36">

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">

          {/* Card 1: Tổng / Hoạt động */}
          <Card className="border-border shadow-xs bg-card overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-primary">
              <Building2 className="h-20 w-20" />
            </div>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-semibold text-muted-foreground uppercase">
                1. Tổng số Phòng ban / Hoạt động
              </CardDescription>
              <CardTitle className="text-3xl font-extrabold text-foreground flex items-center gap-2 mt-1">
                <span className="text-primary">{statsLoading ? "..." : String(totalDepartments)} Phòng</span>
                <span className="text-xs font-semibold text-success-forest bg-success-forest/10 px-2.5 py-0.5 rounded-full">{activeDepartments} Hoạt động</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0"><p className="text-xs text-muted-foreground">Quy mô cơ cấu tổ chức và phòng ban trong trung tâm</p></CardContent>
          </Card>

          {/* Card 2: Phòng ban Rỗng */}
          <Card
            onClick={() => {
              setFilterHasEmployees("FALSE");
              changePage(0);
              scrollToSection("management");
              showBanner("Đã lọc danh sách Phòng ban chưa có nhân viên nào!");
            }}
            className="border-2 border-brand-cobalt/40 bg-linear-to-br from-brand-cobalt/10 via-card to-card shadow-xs cursor-pointer hover:border-brand-cobalt hover:shadow-md hover:scale-[1.005] transition-all group flex flex-col justify-between"
          >
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-extrabold text-brand-cobalt uppercase flex items-center justify-between">
                <span className="flex items-center gap-1"><ShieldAlert className="h-4 w-4" /> 2. Phòng ban chưa có nhân viên</span>
                <span className="px-2 py-0.5 rounded-full bg-brand-cobalt text-white text-[10px] font-black">CẢNH BÁO</span>
              </CardDescription>
              <CardTitle className="text-3xl font-extrabold text-brand-cobalt flex items-center gap-2 mt-1">
                <span>{statsLoading ? "..." : String(emptyDepartments)}</span>
                <span className="text-xs font-semibold text-brand-cobalt bg-brand-cobalt/10 px-2 py-0.5 rounded-full">Chưa có nhân viên</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0"><p className="text-xs text-muted-foreground">Nhấn để lọc phòng ban chưa gán nhân sự →</p></CardContent>
          </Card>

          {/* Card 3: Tổng nhân sự */}
          <Card className="border-border shadow-xs bg-card overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-primary">
              <Users className="h-20 w-20" />
            </div>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-semibold text-muted-foreground uppercase">
                3. Tổng Nhân sự Trực thuộc
              </CardDescription>
              <CardTitle className="text-3xl font-extrabold text-primary flex items-center gap-2 mt-1">
                <span>
                  {statsLoading ? "..." : (
                    employeesByDeptData.length > 0
                      ? `${employeesByDeptData.reduce((s, d) => s + (Number(d.value) || 0), 0)} Nhân viên`
                      : "— Nhân viên"
                  )}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0"><p className="text-xs text-muted-foreground">Đã gán và phân bổ vào các phòng ban chức năng</p></CardContent>
          </Card>

          {/* Card 4: Số nhân viên chưa gán phòng ban */}
          <Card
            onClick={() => { setUnassignedModalOpen(true); }}
            className="border-2 border-brand-cobalt/40 bg-linear-to-br from-brand-cobalt/10 via-card to-card shadow-xs cursor-pointer hover:border-brand-cobalt hover:shadow-md hover:scale-[1.005] transition-all group flex flex-col justify-between"
          >
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-extrabold text-brand-cobalt uppercase flex items-center justify-between">
                <span className="flex items-center gap-1"><Users className="h-4 w-4" /> 4. Chưa Gán Phòng Ban</span>
                <span className="px-2 py-0.5 rounded-full bg-brand-cobalt text-white text-[10px] font-black">XEM CHI TIẾT</span>
              </CardDescription>
              <CardTitle className="text-3xl font-extrabold text-brand-cobalt flex items-center gap-2 mt-1">
                <span>{statsLoading ? "..." : String(countEmployeeNotDepartment)}</span>
                <span className="text-xs font-semibold text-brand-cobalt bg-brand-cobalt/10 px-2 py-0.5 rounded-full">Nhân sự</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0"><p className="text-xs text-muted-foreground">Nhấn để xem danh sách & gán phòng ban đơn/hàng loạt →</p></CardContent>
          </Card>
        </div>

        {/* Year filter cho charts */}
        <div className="flex items-center gap-3 justify-end">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-semibold text-muted-foreground">Lọc biểu đồ theo năm:</span>
            <Select value={chartYear} onValueChange={setChartYear}>
              <SelectTrigger className="h-8 w-28 text-xs bg-background border border-border/40 font-bold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả năm</SelectItem>
                {YEAR_OPTIONS.map(y => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 2 Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Chart 1: Số nhân viên theo phòng ban */}
          <Card className="lg:col-span-6 border-border shadow-xs bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                <span>2. Số lượng Nhân viên Theo Từng Phòng ban</span>
              </CardTitle>
              <CardDescription className="text-xs">Trực quan hóa phòng ban nào đang đông hoặc mỏng nhân sự</CardDescription>
            </CardHeader>
            <CardContent className="min-h-60 flex items-center justify-center">
              {statsLoading ? (
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="text-xs">Đang tải dữ liệu...</span>
                </div>
              ) : statsError ? (
                <div className="flex flex-col items-center gap-2 text-destructive">
                  <AlertCircle className="h-7 w-7" />
                  <span className="text-xs font-semibold">Lỗi tải dữ liệu thống kê</span>
                </div>
              ) : employeesByDeptData.length === 0 ? (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Building2 className="h-10 w-10 opacity-25" />
                  <span className="text-xs">Chưa có dữ liệu nhân sự theo phòng ban</span>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={employeesByDeptData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" style={{ fontSize: "11px" }} />
                    <YAxis dataKey="name" type="category" style={{ fontSize: "11px" }} width={140} />
                    <Tooltip formatter={(v) => [`${v ?? 0} Nhân viên`, "Số lượng nhân sự"]} />
                    <Bar dataKey="value" radius={[0, 6, 6, 0]} fill="var(--primary)">
                      {employeesByDeptData.map((item, idx) => (
                        <Cell key={`cell-${item.name}`} fill={DEPT_COLORS[idx % DEPT_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Chart 2: Cơ cấu Hợp đồng */}
          <Card className="lg:col-span-6 border-border shadow-xs bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-success-forest" />
                <span>5. Cơ cấu Hợp đồng lao động</span>
              </CardTitle>
              <CardDescription className="text-xs">Hữu ích để thấy tỷ lệ nhân sự chính thức và thời vụ theo từng phòng</CardDescription>
            </CardHeader>
            <CardContent className="min-h-60 flex items-center justify-center">
              {statsLoading ? (
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="text-xs">Đang tải dữ liệu...</span>
                </div>
              ) : statsError ? (
                <div className="flex flex-col items-center gap-2 text-destructive">
                  <AlertCircle className="h-7 w-7" />
                  <span className="text-xs font-semibold">Lỗi tải dữ liệu thống kê</span>
                </div>
              ) : typeBreakdownData.length === 0 ? (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Briefcase className="h-10 w-10 opacity-25" />
                  <span className="text-xs">Chưa có dữ liệu cơ cấu hợp đồng</span>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={typeBreakdownData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" style={{ fontSize: "10px" }} interval={0} angle={-15} textAnchor="end" />
                    <YAxis style={{ fontSize: "11px" }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                    <Bar dataKey="fullTime" name="Chính thức" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="partTime" name="Thời vụ" fill="var(--brand-cobalt)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* SECTION 2: MANAGEMENT TABLE */}
      <section id="management" className="scroll-mt-36">
        <Card className="border-border shadow-sm bg-card overflow-hidden">

          {/* Header */}
          <CardHeader className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-border/30 bg-card">
            <div>
              <CardTitle className="text-xl font-semibold tracking-tight font-heading flex items-center gap-2">
                <span>Danh sách Phòng ban trong Hệ thống</span>
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground mt-0.5">
                Quản lý các phòng ban chức năng, phân bổ nhân viên và chuyển phòng hàng loạt.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={handleOpenCreateModal} size="sm" className="h-9 gap-1.5 font-semibold bg-primary text-primary-foreground">
                <Plus className="h-4 w-4" /> <span>Thêm Phòng ban mới</span>
              </Button>
            </div>
          </CardHeader>

          {/* Filter Toolbar */}
          <form onSubmit={handleSearchSubmit} className="py-3 px-4 bg-muted/20 border-b border-border/30 flex flex-wrap items-end gap-3 w-full">
            {/* Search */}
            <div className="flex flex-col gap-1 flex-1 min-w-50">
              <Label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Từ khóa tìm kiếm</Label>
              <div className="relative w-full">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  type="text"
                  placeholder="Tên phòng ban, mã phòng ban..."
                  value={searchKeyword}
                  onChange={(e) => { setSearchKeyword(e.target.value); }}
                  className="pl-8 h-9 text-sm border border-border/30 bg-background rounded-lg focus-visible:ring-2 focus-visible:ring-primary/20 placeholder:opacity-50"
                />
              </div>
            </div>

            {/* Status */}
            <div className="flex flex-col gap-1 w-37.5 shrink-0">
              <Label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Trạng thái</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-9 text-sm border border-border/30 bg-background rounded-lg w-full"><SelectValue placeholder="Tất cả" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
                  <SelectItem value="ACTIVE">Đang hoạt động</SelectItem>
                  <SelectItem value="INACTIVE">Ngừng hoạt động</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Has Employees Filter */}
            <div className="flex flex-col gap-1 w-40 shrink-0">
              <Label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Số lượng nhân viên</Label>
              <Select value={filterHasEmployees} onValueChange={setFilterHasEmployees}>
                <SelectTrigger className="h-9 text-sm border border-border/30 bg-background rounded-lg w-full"><SelectValue placeholder="Tất cả" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tất cả</SelectItem>
                  <SelectItem value="TRUE">Có nhân viên</SelectItem>
                  <SelectItem value="FALSE">Chưa có nhân viên</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Từ ngày tạo Filter */}
            <div className="w-35 shrink-0">
              <DatePickerInput
                label="Từ ngày tạo"
                placeholder="dd/mm/yyyy"
                value={filterStartDate}
                onChange={(isoDate) => {
                  setFilterStartDate(isoDate);
                  changePage(0);
                }}
              />
            </div>

            {/* Đến ngày tạo Filter */}
            <div className="w-35 shrink-0">
              <DatePickerInput
                label="Đến ngày tạo"
                placeholder="dd/mm/yyyy"
                value={filterEndDate}
                onChange={(isoDate) => {
                  setFilterEndDate(isoDate);
                  changePage(0);
                }}
              />
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-1.5 shrink-0 self-end">
              <Button type="submit" size="sm" className="h-9 font-semibold bg-primary text-primary-foreground text-xs rounded-lg px-3">
                <Search className="h-3.5 w-3.5 mr-1" /> Lọc
              </Button>
              <Button type="button" onClick={handleResetFilters} variant="outline" size="sm" className="h-9 text-xs text-muted-foreground hover:text-foreground rounded-lg px-2.5 border border-border/30 bg-background flex items-center gap-1">
                <RotateCcw className="h-3.5 w-3.5 mr-1" /> Đặt lại
              </Button>
            </div>
          </form>

          {/* Table */}
          <CardContent className="p-0 relative min-h-75">
            {loading && (
              <div className="absolute inset-0 bg-background/60 backdrop-blur-xs flex items-center justify-center z-20">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
            )}

            <Table containerClassName="max-h-[calc(100vh-240px)] min-h-[240px] overflow-auto border-b border-border/20">
              <TableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur-md shadow-2xs border-b border-border/40">
                <TableRow className="border-b border-border/30 bg-muted/20 hover:bg-muted/20">
                  <TableHead className="w-8 pb-4">
                    <Checkbox checked={departments.length > 0 && selectedDeptIds.length === departments.length} onCheckedChange={(checked) => { handleSelectAll(Boolean(checked)); }} className="translate-y-0.5 border-border/30" />
                  </TableHead>
                  <TableHead className="cursor-pointer pb-4 select-none text-sm font-semibold uppercase tracking-wider group" onClick={() => { handleSort("code"); }}>
                    <div className="flex items-center gap-1.5 pl-2">
                      <span className={getSortRuleInfo("code") ? "text-primary font-bold" : "text-muted-foreground"}>Mã Phòng</span>
                      {renderSortIcon("code")}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer pb-4 select-none text-sm font-semibold uppercase tracking-wider group" onClick={() => { handleSort("name"); }}>
                    <div className="flex items-center gap-1.5 pl-2">
                      <span className={getSortRuleInfo("name") ? "text-primary font-bold" : "text-muted-foreground"}>Tên Phòng ban</span>
                      {renderSortIcon("name")}
                    </div>
                  </TableHead>
                  <TableHead className="pb-4 text-center text-sm font-semibold uppercase tracking-wider">
                    <div className="flex items-center justify-center gap-1.5">
                      <span className="text-muted-foreground">Trạng thái</span>
                      <Popover>
                        <PopoverTrigger nativeButton={true} render={<Button variant="ghost" size="icon" className="h-5 w-5 p-0 hover:bg-muted"><Filter className={`h-3.5 w-3.5 ${filterStatus !== "ALL" ? "text-primary font-bold" : "text-muted-foreground"}`} /></Button>} />
                        <PopoverContent className="w-48 p-2 text-xs bg-popover border border-border shadow-xl rounded-xl">
                          <div className="font-bold mb-2 pb-1 border-b border-border/40 text-foreground">Lọc trạng thái</div>
                          <Select value={filterStatus} onValueChange={setFilterStatus}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Tất cả" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ALL">Tất cả</SelectItem>
                              <SelectItem value="ACTIVE">Đang hoạt động</SelectItem>
                              <SelectItem value="INACTIVE">Ngừng hoạt động</SelectItem>
                            </SelectContent>
                          </Select>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </TableHead>
                  <TableHead className="pb-4 select-none text-sm font-semibold uppercase tracking-wider text-center group">
                    <div className="flex items-center gap-1.5 justify-center">
                      <span className={`cursor-pointer ${getSortRuleInfo("employeeCount") ? "text-primary font-bold" : "text-muted-foreground"}`} onClick={() => { handleSort("employeeCount"); }}>
                        Số lượng NV
                      </span>
                      <span className="cursor-pointer" onClick={() => { handleSort("employeeCount"); }}>{renderSortIcon("employeeCount")}</span>
                      <Popover>
                        <PopoverTrigger nativeButton={true} render={<Button variant="ghost" size="icon" className="h-5 w-5 p-0 hover:bg-muted"><Filter className={`h-3.5 w-3.5 ${filterHasEmployees !== "ALL" ? "text-primary font-bold" : "text-muted-foreground"}`} /></Button>} />
                        <PopoverContent className="w-48 p-2 text-xs bg-popover border border-border shadow-xl rounded-xl">
                          <div className="font-bold mb-2 pb-1 border-b border-border/40 text-foreground">Lọc số lượng NV</div>
                          <Select value={filterHasEmployees} onValueChange={(val) => { setFilterHasEmployees(val); changePage(0); }}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Tất cả" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ALL">Tất cả</SelectItem>
                              <SelectItem value="TRUE">Có nhân viên</SelectItem>
                              <SelectItem value="FALSE">Chưa có nhân viên</SelectItem>
                            </SelectContent>
                          </Select>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer pb-4 select-none text-sm font-semibold uppercase tracking-wider text-center group" onClick={() => { handleSort("createdAt"); }}>
                    <div className="flex items-center gap-1.5 justify-center">
                      <span className={getSortRuleInfo("createdAt") ? "text-primary font-bold" : "text-muted-foreground"}>Ngày tạo</span>
                      {renderSortIcon("createdAt")}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer pb-4 select-none text-sm font-semibold uppercase tracking-wider text-center group" onClick={() => { handleSort("updatedAt"); }}>
                    <div className="flex items-center gap-1.5 justify-center">
                      <span className={getSortRuleInfo("updatedAt") ? "text-primary font-bold" : "text-muted-foreground"}>Cập nhật lần cuối</span>
                      {renderSortIcon("updatedAt")}
                    </div>
                  </TableHead>
                  <TableHead className="text-sm text-center pb-4 font-semibold text-muted-foreground uppercase tracking-wider">Thao tác</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody className="opacity-90">
                {departments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-16 text-center">
                      {tableError ? (
                        <div className="flex flex-col items-center gap-3 text-destructive">
                          <AlertCircle className="h-10 w-10 opacity-60" />
                          <div>
                            <p className="font-semibold text-sm">Lỗi tải dữ liệu</p>
                            <p className="text-xs text-muted-foreground mt-1">{tableError}</p>
                          </div>
                          <button onClick={() => { void fetchDepartments(); }} className="text-xs text-primary hover:underline font-semibold flex items-center gap-1">
                            <RefreshCw className="h-3 w-3" /> Thử lại
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-3 text-muted-foreground">
                          <Building2 className="h-12 w-12 opacity-20" />
                          <div>
                            <p className="font-semibold text-sm">Không có phòng ban nào</p>
                            <p className="text-xs mt-1">Không tìm thấy phòng ban phù hợp với điều kiện lọc hiện tại.</p>
                          </div>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  departments.map((dept) => {
                    const isNewlyCreated = dept.id === newlyCreatedId;
                    return (
                      <TableRow
                        key={dept.id}
                        className={cn(
                          "transition-all duration-700 border-border/30",
                          isNewlyCreated
                            ? "bg-primary/10 border-l-4 border-l-primary font-semibold shadow-xs"
                            : "hover:bg-foreground/10"
                        )}
                      >
                        <TableCell>
                          <Checkbox checked={selectedDeptIds.includes(dept.id)} onCheckedChange={() => { handleSelectDept(dept.id); }} className="translate-y-0.5 border-border/30" />
                        </TableCell>

                        <TableCell className="font-mono font-bold text-primary text-sm pl-2">
                          <span className="px-2.5 py-0.5 rounded-lg bg-primary/10 border border-primary/20">{dept.code}</span>
                        </TableCell>

                        <TableCell>
                          <div>
                            <p onClick={() => { handleOpenDetailModal(dept); }} className="font-semibold text-foreground hover:text-primary cursor-pointer transition-colors text-sm">
                              {dept.name}
                            </p>
                            <p className="text-xs text-muted-foreground truncate max-w-xs">{dept.description ?? "Chưa thiết lập mô tả"}</p>
                          </div>
                        </TableCell>

                        <TableCell className="text-center">
                          <Badge className={dept.status === "ACTIVE" ? "bg-success-forest text-white font-bold text-[11px]" : "bg-destructive text-white font-bold text-[11px]"}>
                            {dept.status === "ACTIVE" ? "Đang hoạt động" : "Ngừng hoạt động"}
                          </Badge>
                        </TableCell>

                        <TableCell className="text-center font-mono font-bold text-xs">
                          <span className={cn(
                            "px-2.5 py-0.5 rounded-full text-xs border font-bold",
                            (dept.employeeCount ?? 0) > 0
                              ? "bg-primary/10 text-primary border-primary/20"
                              : "bg-muted/40 text-muted-foreground border-border"
                          )}>
                            {dept.employeeCount ?? 0} NV
                          </span>
                        </TableCell>

                        <TableCell className="text-center font-mono font-medium text-xs text-muted-foreground">
                          {dept.createdAt ? formatDateDisplay(dept.createdAt) : "—"}
                        </TableCell>

                        <TableCell className="text-center font-mono font-medium text-xs text-muted-foreground">
                          {dept.updatedAt ? formatDateDisplay(dept.updatedAt) : "—"}
                        </TableCell>

                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button onClick={() => { handleOpenDetailModal(dept); }} variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-primary/10" title="Xem chi tiết & Nhân viên">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button onClick={() => { handleOpenEditModal(dept); }} variant="ghost" size="icon" className="h-8 w-8 text-brand-cobalt hover:bg-brand-cobalt/10" title="Sửa Phòng ban">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button onClick={() => { handleOpenDetailModal(dept, "employees"); }} variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-primary/10 cursor-pointer" title="Chuyển nhân viên sang phòng khác">
                              <ArrowRightLeft className="h-4 w-4" />
                            </Button>
                            <Button
                              onClick={() => { handleDeleteDepartment(dept.id); }}
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:bg-destructive/10 cursor-pointer"
                              title="Xóa Phòng ban"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>

          {/* Pagination */}
          <div className="px-5 py-3 border-t border-border/40 bg-card flex flex-col md:flex-row items-center justify-between gap-4 text-sm font-medium">
            <div className="text-muted-foreground">
              Hiển thị <span className="font-semibold text-foreground">{departments.length === 0 ? 0 : page * pageSize + 1}</span> đến{" "}
              <span className="font-semibold text-foreground">{Math.min((page + 1) * pageSize, totalElements)}</span> trên{" "}
              <span className="font-semibold text-foreground">{totalElements}</span> bản ghi
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Số dòng/trang:</span>
                <Select value={String(pageSize)} onValueChange={(val) => { setPageSize(Number(val)); changePage(0); }}>
                  <SelectTrigger className="h-8 w-16 text-xs bg-background border border-border rounded-lg font-bold"><SelectValue placeholder={String(pageSize)} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const pNum = parseInt(jumpPageInput, 10);
                  if (!isNaN(pNum) && pNum >= 1 && pNum <= totalPages) changePage(pNum - 1);
                }}
                className="flex items-center gap-1.5"
              >
                <span className="text-muted-foreground">Tới trang:</span>
                <Input type="number" min={1} max={totalPages || 1} value={jumpPageInput} onChange={(e) => { setJumpPageInput(e.target.value); }} className="h-8 w-14 text-center text-xs font-bold bg-background border border-border rounded-lg" />
              </form>
              <div className="flex items-center gap-1">
                <Button disabled={page === 0} onClick={() => { changePage(page - 1); }} variant="outline" size="sm" className="h-8 text-xs font-semibold rounded-lg">
                  <ChevronLeft className="h-3.5 w-3.5" /> Trước
                </Button>
                {getPageNumbers(page, totalPages).map((p, idx) => {
                  if (p === "...") return <span key={`dots-${idx}`} className="px-1 text-muted-foreground">...</span>;
                  const pageNum = p as number;
                  const isCurrent = pageNum === page;
                  return (
                    <Button key={pageNum} onClick={() => { changePage(pageNum); }} variant={isCurrent ? "default" : "outline"} size="sm" className="h-8 w-8 text-xs font-semibold rounded-lg">
                      {pageNum + 1}
                    </Button>
                  );
                })}
                <Button disabled={page >= totalPages - 1} onClick={() => { changePage(page + 1); }} variant="outline" size="sm" className="h-8 text-xs font-semibold rounded-lg">
                  Sau <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </section>

      {/* Department Detail Modal */}
      <DepartmentDetailModal
        open={detailModalOpen}
        onClose={() => { setDetailModalOpen(false); }}
        department={selectedDeptForDetail}
        allDepartments={departments}
        initialTab={detailModalTab}
        onEditDept={(dept) => { setDetailModalOpen(false); handleOpenEditModal(dept); }}
        onDeleteDept={handleDeleteDepartment}
        onShowBanner={showBanner}
        onRefreshData={() => { void fetchDepartments(); void fetchOverviewStats(); }}
      />

      {/* CREATE / EDIT DEPARTMENT MODAL */}
      <Dialog open={formModalOpen} onOpenChange={(val) => { if (!val) handleCloseFormModal(); else setFormModalOpen(true); }}>
        <DialogContent className="max-w-md w-[90vw] p-6 rounded-2xl bg-card border border-border/40 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground">
              {editingDept ? "Sửa thông tin Phòng ban" : "Thêm Phòng ban mới"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {editingDept ? "Cập nhật tên, mô tả và trạng thái phòng ban." : "Nhập tên và mô tả. Mã code sẽ được hệ thống tự động sinh."}
            </DialogDescription>
          </DialogHeader>

          {/* CREATE FORM */}
          {!editingDept && (
            <Form {...createForm}>
              <form onSubmit={(e) => { void createForm.handleSubmit((values) => { void handleSaveDepartment(values); })(e); }} className="space-y-4 py-2">

                {/* Code - Readonly (auto-generated by BE) */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-muted-foreground">Mã phòng ban</Label>
                  <Input
                    placeholder="Tự động sinh (VD: DP-2607-A1B2C3)"
                    disabled
                    className="h-9 text-sm font-mono uppercase border-border/30 bg-muted/40 text-muted-foreground cursor-not-allowed"
                  />
                  <p className="text-[11px] text-muted-foreground italic">Mã code sẽ được tự động sinh bằng CodeGenerator.</p>
                </div>

                <FormField
                  control={createForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold text-muted-foreground">Tên Phòng ban *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="VD: Phòng Đào tạo & Nghiên cứu"
                          className="h-9 text-sm border-border/30 font-semibold"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold text-muted-foreground">Mô tả chức năng</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Mô tả nhiệm vụ và chức năng của phòng ban..."
                          className="h-9 text-sm border-border/30"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <DialogFooter className="pt-2">
                  <Button type="button" variant="outline" size="sm" onClick={handleCloseFormModal}>Hủy</Button>
                  <Button type="submit" size="sm" disabled={formSubmitting} className="bg-primary text-primary-foreground font-semibold">
                    {formSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                    Tạo Phòng ban
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          )}

          {/* EDIT FORM */}
          {editingDept && (
            <Form {...editForm}>
              <form onSubmit={(e) => { void editForm.handleSubmit((values) => { void handleSaveDepartment(values); })(e); }} className="space-y-4 py-2">

                {/* Code - Readonly */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-muted-foreground">Mã phòng ban</Label>
                  <Input
                    value={editingDept.code}
                    disabled
                    className="h-9 text-sm font-mono uppercase border-border/30 bg-muted/40 text-muted-foreground cursor-not-allowed"
                  />
                  <p className="text-[11px] text-muted-foreground italic">Mã code cố định, không thể chỉnh sửa.</p>
                </div>

                <FormField
                  control={editForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold text-muted-foreground">Tên Phòng ban *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="VD: Phòng Đào tạo & Nghiên cứu"
                          className="h-9 text-sm border-border/30 font-semibold"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold text-muted-foreground">Mô tả chức năng</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Mô tả nhiệm vụ và chức năng của phòng ban..."
                          className="h-9 text-sm border-border/30"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold text-muted-foreground">Trạng thái</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="h-9 text-xs border-border/30 font-bold"><SelectValue /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ACTIVE">ACTIVE (Đang hoạt động)</SelectItem>
                          <SelectItem value="INACTIVE">INACTIVE (Ngừng hoạt động)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <DialogFooter className="pt-2">
                  <Button type="button" variant="outline" size="sm" onClick={handleCloseFormModal}>Hủy</Button>
                  <Button type="submit" size="sm" disabled={formSubmitting} className="bg-primary text-primary-foreground font-semibold">
                    {formSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                    Lưu thay đổi
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>

      {/* CONFIRM DELETE DIALOG */}
      <ConfirmDialog
        open={Boolean(deleteConfirmDeptId)}
        onOpenChange={(open) => { if (!open) setDeleteConfirmDeptId(null); }}
        title="Xác nhận xóa Phòng ban"
        description="Bạn có chắc chắn muốn xóa Phòng ban này? Thao tác này sẽ gỡ hoàn toàn dữ liệu phòng ban."
        confirmText="Xóa ngay"
        cancelText="Hủy bỏ"
        onConfirm={() => { void confirmDeleteDepartment(); }}
      />

      {/* UNASSIGNED EMPLOYEES MODAL */}
      <UnassignedEmployeesModal
        open={unassignedModalOpen}
        onClose={() => { setUnassignedModalOpen(false); }}
        allDepartments={departments}
        onSuccess={() => {
          void fetchOverviewStats();
          void fetchDepartments();
        }}
        onShowBanner={(msg, isErr) => { showBanner(msg, isErr); }}
      />

    </div>
  );
};
