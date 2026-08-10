import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  salesApi,
  type CoursePackageItem,
  type CoursePackageDetail,
  type CoursePackageStats,
  type DeliveryModeEnum,
} from "@/api/sales/salesApi";
import { ServerCourseSelect } from "@/components/sales/ServerCourseSelect";
import { StatusBadge } from "@/components/sales/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Package,
  Plus,
  Search,
  RefreshCw,
  Edit,
  Trash2,
  Eye,
  CheckCircle2,
  BookOpen,
  Users,
  UserCheck,
  Calendar,
  Info,
  AlertTriangle,
  GraduationCap,
  Sparkles,
  Radio,
  Layers,
  BadgePercent,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  ShieldAlert,
  PackageX,
  Loader2,
  Clock,
  User,
  Hash,
  Shield,
  Tag,
} from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { cn } from "@/lib/utils";

type SortOrder = "asc" | "desc";

// Shared Option Lists at the top of file
export const DELIVERY_MODE_OPTIONS = [
  { value: "ALL", label: "Tất cả hình thức" },
  { value: "SELF_STUDY", label: "Gói Tự Học (Self-Study)" },
  { value: "GROUP_CLASS", label: "Lớp Học Nhóm (Group Class)" },
  { value: "ONE_ON_ONE", label: "Gia Sư 1 Kèm 1 (One-on-One)" },
  { value: "COMBO", label: "Gói Combo Hỗn Hợp (Combo)" },
] as const;

export const STATUS_OPTIONS = [
  { value: "ALL", label: "Tất cả trạng thái" },
  { value: "ACTIVE", label: "Đang hoạt động" },
  { value: "INACTIVE", label: "Đã ẩn / Tạm dừng" },
  { value: "OUT_OF_STOCK", label: "Hết chỗ (Out of Stock)" },
] as const;

const formatVND = (val?: number | string) => {
  if (val == null) return "—";
  const num = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(num)) return "—";
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(num);
};

const formatDate = (dateStr?: string) => {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
};

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

const renderDeliveryBadge = (mode: DeliveryModeEnum | string) => {
  switch (mode) {
    case "ONE_ON_ONE":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-extrabold uppercase rounded-full bg-purple-100/90 text-purple-800 border border-purple-300/80 dark:bg-purple-950/80 dark:text-purple-300 dark:border-purple-800 shadow-2xs">
          <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
          Kèm 1-1
        </span>
      );
    case "GROUP_CLASS":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-extrabold uppercase rounded-full bg-amber-100/90 text-amber-800 border border-amber-300/80 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800 shadow-2xs">
          <Users className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          Lớp Nhóm
        </span>
      );
    case "COMBO":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-extrabold uppercase rounded-full bg-blue-100/90 text-blue-800 border border-blue-300/80 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-800 shadow-2xs">
          <Layers className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          Combo
        </span>
      );
    case "SELF_STUDY":
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-extrabold uppercase rounded-full bg-emerald-100/90 text-emerald-800 border border-emerald-300/80 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800 shadow-2xs">
          <GraduationCap className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          Tự Học
        </span>
      );
  }
};

const getDeliveryGradient = (mode: DeliveryModeEnum | string) => {
  switch (mode) {
    case "ONE_ON_ONE":
      return "from-purple-500 via-indigo-500 to-violet-500";
    case "COMBO":
      return "from-blue-500 via-sky-500 to-cyan-500";
    case "GROUP_CLASS":
      return "from-amber-500 via-orange-500 to-yellow-500";
    case "SELF_STUDY":
    default:
      return "from-emerald-500 via-teal-500 to-green-500";
  }
};

const getDiscountPercent = (original?: number | string, selling?: number | string) => {
  const o = typeof original === "string" ? parseFloat(original) : original;
  const s = typeof selling === "string" ? parseFloat(selling) : selling;
  if (!o || !s || isNaN(o) || isNaN(s) || o <= s) return null;
  const pct = Math.round(((o - s) / o) * 100);
  return isNaN(pct) || pct <= 0 ? null : pct;
};

const extractPackagePrices = (pkg: any) => {
  const sellingPrice = Number(pkg?.sellingPrice ?? pkg?.price ?? pkg?.priceSnapshot ?? 0);
  const rawOrig = pkg?.originalPrice ?? pkg?.price ?? sellingPrice;
  const originalPrice = Number(rawOrig);
  return {
    sellingPrice: isNaN(sellingPrice) ? 0 : sellingPrice,
    originalPrice: isNaN(originalPrice) ? sellingPrice : originalPrice,
  };
};

export const SalesCoursePackageListPage: React.FC = () => {
  const navigate = useNavigate();
  const { success, error } = useToast();

  // Data & Stats State
  const [packages, setPackages] = useState<CoursePackageItem[]>([]);
  const [stats, setStats] = useState<CoursePackageStats>({
    totalPackages: 0,
    activePackages: 0,
    outOfStockPackages: 0,
    inactivePackages: 0,
  });

  // Loading States
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  // Filters & Search State
  const [searchTerm, setSearchTerm] = useState("");
  const [courseFilter, setCourseFilter] = useState("ALL");
  const [deliveryModeFilter, setDeliveryModeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Selection & Bulk Actions State
  const [selectedPackageIds, setSelectedPackageIds] = useState<string[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Sorting State
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  // View Mode & Pagination State (DEFAULT: GRID VIEW as requested)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(9);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [jumpPageInput, setJumpPageInput] = useState("1");

  // Detail modal state
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<CoursePackageDetail | null>(null);

  // Delete confirm state
  const [deleteTarget, setDeleteTarget] = useState<CoursePackageItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Fetch Stats from GET /api/v1/course-packages/stats
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const data = await salesApi.getCoursePackageStats();
      setStats(data);
    } catch {
      // Error handling
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Execute Search via GET /api/v1/course-packages/search with pagination
  const executeSearch = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {
        page,
        size: pageSize,
        sort: `createdAt:${sortOrder}`,
      };

      if (searchTerm.trim()) params.keyword = searchTerm.trim();
      if (statusFilter !== "ALL") params.status = statusFilter;
      if (deliveryModeFilter !== "ALL") params.deliveryMode = deliveryModeFilter;
      if (courseFilter !== "ALL") params.courseId = courseFilter;

      const result = await salesApi.searchCoursePackages(params);
      setPackages(result.content);
      setTotalElements(result.totalElements);
      setTotalPages(result.totalPages);
    } catch {
      error("Không thể tải danh sách gói học từ máy chủ");
      setPackages([]);
      setTotalElements(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, sortOrder, searchTerm, statusFilter, deliveryModeFilter, courseFilter, error]);

  // Initial Load
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Trigger search when search/filter/pagination params change
  useEffect(() => {
    executeSearch();
  }, [executeSearch]);

  const handleFilterChange = (setter: (val: string) => void, val: string) => {
    setter(val);
    setPage(0);
    setSelectedPackageIds([]);
  };

  useEffect(() => {
    setJumpPageInput(String(page + 1));
  }, [page]);

  const handleToggleSortOrder = () => {
    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    setPage(0);
  };

  const handleToggleStatus = async (pkg: CoursePackageItem) => {
    const nextStatus = pkg.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    setPackages((prev) =>
      prev.map((p) => (p.id === pkg.id ? { ...p, status: nextStatus as any } : p))
    );
    const ok = await salesApi.toggleCoursePackageStatus(pkg.id, nextStatus as any);
    if (ok) {
      success(
        nextStatus === "INACTIVE"
          ? `Đã ẩn gói "${pkg.name}"`
          : `Đã kích hoạt gói "${pkg.name}"`
      );
      fetchStats();
    } else {
      setPackages((prev) =>
        prev.map((p) => (p.id === pkg.id ? { ...p, status: pkg.status } : p))
      );
      error("Không thể cập nhật trạng thái gói học");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    const ok = await salesApi.deleteCoursePackage(deleteTarget.id);
    setDeleteLoading(false);
    if (ok) {
      setPackages((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      setSelectedPackageIds((prev) => prev.filter((id) => id !== deleteTarget.id));
      success(`Đã xóa gói "${deleteTarget.name}"`);
      fetchStats();
      executeSearch();
    } else {
      error("Không thể xóa gói học. Vui lòng thử lại.");
    }
    setDeleteTarget(null);
  };

  // View Detail Modal (Loads full response matching CoursePackageResponse)
  const handleViewDetail = async (pkg: CoursePackageItem) => {
    setDetailOpen(true);
    setDetailLoading(true);

    const { sellingPrice, originalPrice } = extractPackagePrices(pkg);

    const fallbackDetail: CoursePackageDetail = {
      id: String(pkg.id),
      code: pkg.code || String(pkg.id),
      name: pkg.name || "Gói bán khóa học",
      courseId: String(pkg.courseId || ""),
      courseName: pkg.courseName || "Khóa học chưa đặt tên",
      deliveryMode: pkg.deliveryMode || "SELF_PACED",
      price: sellingPrice,
      originalPrice: originalPrice,
      status: pkg.status || "ACTIVE",
      durationDays: pkg.durationDays,
      includedTutorSessions: pkg.includedTutorSessions,
      maxGroupSize: pkg.maxGroupSize,
      className: pkg.className,
      description: (pkg as any).description || (pkg as any).desc,
      createdAt: pkg.createdAt,
      updatedAt: pkg.updatedAt,
    };

    try {
      const d = await salesApi.getCoursePackageById(pkg.id);
      if (d) {
        const dPrices = extractPackagePrices(d);
        setDetail({
          ...d,
          code: d.code || pkg.code || String(d.id),
          price: dPrices.sellingPrice,
          originalPrice: dPrices.originalPrice,
        });
      } else {
        setDetail(fallbackDetail);
      }
    } catch {
      setDetail(fallbackDetail);
    } finally {
      setDetailLoading(false);
    }
  };

  // Selection Checkbox Logic
  const handleSelectAllPackages = (checked: boolean) => {
    if (checked) {
      setSelectedPackageIds(packages.map((p) => String(p.id)));
    } else {
      setSelectedPackageIds([]);
    }
  };

  const handleSelectPackage = (id: string) => {
    setSelectedPackageIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Bulk Actions
  const handleBulkStatusChange = async (nextStatus: "ACTIVE" | "INACTIVE" | "OUT_OF_STOCK") => {
    if (selectedPackageIds.length === 0) return;
    setBulkActionLoading(true);
    let updatedCount = 0;

    for (const id of selectedPackageIds) {
      const ok = await salesApi.toggleCoursePackageStatus(id, nextStatus);
      if (ok) updatedCount++;
    }

    setPackages((prev) =>
      prev.map((p) =>
        selectedPackageIds.includes(String(p.id)) ? { ...p, status: nextStatus } : p
      )
    );
    setBulkActionLoading(false);
    success(`Đã cập nhật trạng thái cho ${updatedCount} gói học`);
    fetchStats();
  };

  const handleBulkDelete = async () => {
    if (selectedPackageIds.length === 0) return;
    if (!window.confirm(`Bạn có chắc chắn muốn xóa ${selectedPackageIds.length} gói học đã chọn?`)) {
      return;
    }
    setBulkActionLoading(true);
    let deletedCount = 0;

    for (const id of selectedPackageIds) {
      const ok = await salesApi.deleteCoursePackage(id);
      if (ok) deletedCount++;
    }

    setSelectedPackageIds([]);
    setBulkActionLoading(false);
    success(`Đã xóa thành công ${deletedCount} gói học`);
    fetchStats();
    executeSearch();
  };

  const isAllSelected = packages.length > 0 && packages.every((p) => selectedPackageIds.includes(String(p.id)));

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Quản lý Gói bán Khóa học
            </h1>
            <Badge variant="outline" className="font-mono font-bold text-xs bg-primary/10 text-primary border-primary/20 px-2.5 py-0.5">
              {stats.totalPackages} gói
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Cấu hình giá bán, hình thức đào tạo, quy mô sĩ số lớp và quản lý quyền lợi phân phối
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchStats();
              executeSearch();
            }}
            disabled={loading || statsLoading}
            className="rounded-xl gap-2 cursor-pointer text-xs font-semibold h-9 px-3"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading || statsLoading ? "animate-spin" : ""}`} />
            Làm mới
          </Button>
          <Link to="/sales/course-packages/new">
            <Button
              size="sm"
              className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl gap-2 cursor-pointer text-xs font-semibold h-9 px-3.5 shadow-xs"
            >
              <Plus className="h-4 w-4" />
              Tạo Gói bán mới
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. KPI Cards Row (4 Cards including outOfStockPackages) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-border/40 bg-card overflow-hidden transition-all hover:shadow-xs relative">
          {statsLoading && (
            <div className="absolute inset-0 bg-background/50 backdrop-blur-2xs flex items-center justify-center z-10">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            </div>
          )}
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground">Tổng số gói bán</p>
              <p className="text-2xl font-extrabold tracking-tight text-foreground mt-1 font-mono">
                {stats.totalPackages}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Tổng số gói trong hệ thống</p>
            </div>
            <div className="rounded-xl bg-primary/10 p-3 text-primary">
              <Package className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-emerald-500/20 bg-emerald-500/5 overflow-hidden transition-all hover:shadow-xs relative">
          {statsLoading && (
            <div className="absolute inset-0 bg-background/50 backdrop-blur-2xs flex items-center justify-center z-10">
              <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
            </div>
          )}
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-400">Đang hoạt động</p>
              <p className="text-2xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
                {stats.activePackages}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Sẵn sàng mở bán cho học viên</p>
            </div>
            <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-amber-500/20 bg-amber-500/5 overflow-hidden transition-all hover:shadow-xs relative">
          {statsLoading && (
            <div className="absolute inset-0 bg-background/50 backdrop-blur-2xs flex items-center justify-center z-10">
              <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
            </div>
          )}
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-400">Đã ẩn / Tạm dừng</p>
              <p className="text-2xl font-extrabold tracking-tight text-amber-600 dark:text-amber-400 mt-1 font-mono">
                {stats.inactivePackages}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Tạm dừng phân phối sản phẩm</p>
            </div>
            <div className="rounded-xl bg-amber-500/10 p-3 text-amber-600 dark:text-amber-400">
              <ShieldAlert className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-rose-500/20 bg-rose-500/5 overflow-hidden transition-all hover:shadow-xs relative">
          {statsLoading && (
            <div className="absolute inset-0 bg-background/50 backdrop-blur-2xs flex items-center justify-center z-10">
              <Loader2 className="h-4 w-4 animate-spin text-rose-600" />
            </div>
          )}
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-rose-800 dark:text-rose-400">Hết chỗ (Out of Stock)</p>
              <p className="text-2xl font-extrabold tracking-tight text-rose-600 dark:text-rose-400 mt-1 font-mono">
                {stats.outOfStockPackages}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Đã đủ số lượng học viên</p>
            </div>
            <div className="rounded-xl bg-rose-500/10 p-3 text-rose-600 dark:text-rose-400">
              <PackageX className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Main Controls & Filtering Section */}
      <section className="space-y-4">
        {/* Unified Filter Toolbar */}
        <div className="bg-card p-4 rounded-2xl border border-border/50 shadow-2xs flex flex-col lg:flex-row items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row flex-wrap items-center gap-2.5 w-full lg:w-auto flex-1">
            {/* Search Input */}
            <div className="relative flex-1 w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm theo Mã code, Tên gói..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 text-xs h-9 bg-background border-border/60 rounded-xl"
              />
            </div>

            {/* SERVER-SIDE SEARCH + INFINITE SCROLL COURSE SELECT DROPDOWN */}
            <ServerCourseSelect
              value={courseFilter}
              onChange={(val) => handleFilterChange(setCourseFilter, val)}
              placeholder="Chọn Khóa học"
              allLabel="Tất cả khóa học"
              className="w-full sm:w-56"
            />

            {/* Filter Delivery Mode */}
            <Select value={deliveryModeFilter} onValueChange={(val) => handleFilterChange(setDeliveryModeFilter, val)}>
              <SelectTrigger className="h-9 text-xs w-full sm:w-44 bg-background border-border/60 rounded-xl font-medium">
                <SelectValue placeholder="Hình thức đào tạo" />
              </SelectTrigger>
              <SelectContent>
                {DELIVERY_MODE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Filter Status */}
            <Select value={statusFilter} onValueChange={(val) => handleFilterChange(setStatusFilter, val)}>
              <SelectTrigger className="h-9 text-xs w-full sm:w-38 bg-background border-border/60 rounded-xl font-medium">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Reset Filters */}
            {(searchTerm || deliveryModeFilter !== "ALL" || statusFilter !== "ALL" || courseFilter !== "ALL") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm("");
                  setCourseFilter("ALL");
                  setDeliveryModeFilter("ALL");
                  setStatusFilter("ALL");
                  setPage(0);
                }}
                className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1.5 rounded-xl cursor-pointer"
                title="Xóa bộ lọc"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Đặt lại
              </Button>
            )}
          </div>

          {/* View Switcher & Bulk Actions */}
          <div className="flex items-center gap-2 w-full lg:w-auto justify-between lg:justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleSortOrder}
              className="h-8 text-xs font-semibold gap-1 rounded-xl cursor-pointer shrink-0"
              title="Đổi thứ tự tạo"
            >
              {sortOrder === "desc" ? (
                <>
                  <ArrowDown className="h-3.5 w-3.5 text-primary" /> Mới nhất
                </>
              ) : (
                <>
                  <ArrowUp className="h-3.5 w-3.5 text-primary" /> Cũ nhất
                </>
              )}
            </Button>

            {selectedPackageIds.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-primary px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20">
                  Đã chọn {selectedPackageIds.length} gói
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={bulkActionLoading}
                  onClick={() => handleBulkStatusChange("ACTIVE")}
                  className="h-8 text-xs font-semibold text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10 rounded-lg cursor-pointer"
                >
                  Mở bán
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={bulkActionLoading}
                  onClick={() => handleBulkStatusChange("INACTIVE")}
                  className="h-8 text-xs font-semibold text-amber-600 border-amber-500/30 hover:bg-amber-500/10 rounded-lg cursor-pointer"
                >
                  Ẩn gói
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={bulkActionLoading}
                  onClick={handleBulkDelete}
                  className="h-8 text-xs font-semibold rounded-lg cursor-pointer gap-1"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Xóa
                </Button>
              </div>
            )}

            {/* View Mode Toggle (DEFAULT: GRID VIEW) */}
            <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/50 shrink-0">
              <Button
                type="button"
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className={cn(
                  "h-7 px-2.5 text-xs gap-1.5 rounded-lg cursor-pointer transition-all",
                  viewMode === "grid"
                    ? "bg-primary text-primary-foreground shadow-2xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                )}
                title="Xem dạng Lưới (Mặc định)"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Lưới
              </Button>
              <Button
                type="button"
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className={cn(
                  "h-7 px-2.5 text-xs gap-1.5 rounded-lg cursor-pointer transition-all",
                  viewMode === "list"
                    ? "bg-primary text-primary-foreground shadow-2xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                )}
                title="Xem dạng Bảng"
              >
                <List className="h-3.5 w-3.5" />
                Bảng
              </Button>
            </div>
          </div>
        </div>

        {/* 4. Display Content Area */}
        <Card className="border border-border/50 bg-card rounded-2xl overflow-hidden shadow-2xs relative min-h-[320px]">
          {loading && (
            <div className="absolute inset-0 bg-background/60 backdrop-blur-2xs flex items-center justify-center z-20">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
                <p className="text-xs font-semibold text-muted-foreground">Đang tải dữ liệu gói học từ máy chủ...</p>
              </div>
            </div>
          )}

          {packages.length === 0 && !loading ? (
            <div className="p-16 text-center text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-bold text-foreground">Chưa có gói học nào từ máy chủ</p>
              <p className="text-xs mt-1 text-muted-foreground">
                Vui lòng thử lại hoặc thay đổi điều kiện tìm kiếm/bộ lọc
              </p>
            </div>
          ) : viewMode === "grid" ? (
            /* ─── GRID VIEW (CARD GRID - DEFAULT) ─── */
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {packages.map((pkg) => {
                const { sellingPrice, originalPrice } = extractPackagePrices(pkg);
                const discountPct = getDiscountPercent(originalPrice, sellingPrice);
                const isInactive = pkg.status === "INACTIVE";

                return (
                  <Card
                    key={pkg.id}
                    className={cn(
                      "group relative border rounded-2xl overflow-hidden bg-card flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 hover:shadow-lg",
                      isInactive
                        ? "border-dashed border-border/50 bg-muted/20 opacity-80"
                        : "border-border/60 hover:border-indigo-300 dark:hover:border-indigo-800"
                    )}
                  >
                    <div className={`h-1.5 w-full bg-linear-to-r ${getDeliveryGradient(pkg.deliveryMode)}`} />

                    <CardContent className="p-5 space-y-4">
                      <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {renderDeliveryBadge(pkg.deliveryMode)}
                          <span className="px-2 py-0.5 rounded-md bg-muted text-[11px] font-mono font-bold text-primary border border-border/60">
                            {pkg.code || pkg.id}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <StatusBadge status={pkg.status} size="sm" />
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(pkg)}
                            className={cn(
                              "w-9 h-5 rounded-full transition-colors relative p-0.5 cursor-pointer focus:outline-hidden",
                              pkg.status === "ACTIVE"
                                ? "bg-emerald-500 hover:bg-emerald-600"
                                : "bg-zinc-300 dark:bg-zinc-700 hover:bg-zinc-400"
                            )}
                          >
                            <div
                              className={cn(
                                "h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
                                pkg.status === "ACTIVE" ? "translate-x-4" : "translate-x-0"
                              )}
                            />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <h3 className="font-extrabold text-base text-foreground leading-snug tracking-tight group-hover:text-primary transition-colors line-clamp-2">
                          {pkg.name}
                        </h3>
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/60 text-xs text-muted-foreground font-medium max-w-full truncate">
                          <BookOpen className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                          <span className="truncate">{pkg.courseName || "Khóa học gốc"}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40 space-y-0.5">
                          <p className="text-[10px] text-muted-foreground font-semibold uppercase leading-none">Ngày tạo</p>
                          <p className="text-xs font-bold text-foreground truncate mt-0.5 font-mono">
                            {formatDate(pkg.createdAt)}
                          </p>
                        </div>

                        {pkg.deliveryMode === "ONE_ON_ONE" ? (
                          <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200/60 dark:border-purple-800 space-y-0.5">
                            <p className="text-[10px] text-purple-700 dark:text-purple-300 font-semibold uppercase leading-none">Tutor 1-1</p>
                            <p className="text-xs font-bold text-purple-800 dark:text-purple-200 truncate mt-0.5">
                              {pkg.includedTutorSessions ? `${pkg.includedTutorSessions} buổi kèm` : "1-1 Mentor"}
                            </p>
                          </div>
                        ) : pkg.deliveryMode === "GROUP_CLASS" || pkg.deliveryMode === "COMBO" ? (
                          <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800 space-y-0.5">
                            <p className="text-[10px] text-amber-700 dark:text-amber-300 font-semibold uppercase leading-none">Sĩ số lớp</p>
                            <p className="text-xs font-bold text-amber-800 dark:text-amber-200 truncate mt-0.5 font-mono">
                              Tối đa {pkg.maxGroupSize || 20} HV
                            </p>
                          </div>
                        ) : (
                          <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800 space-y-0.5">
                            <p className="text-[10px] text-emerald-700 dark:text-emerald-300 font-semibold uppercase leading-none">Quy mô</p>
                            <p className="text-xs font-bold text-emerald-800 dark:text-emerald-200 truncate mt-0.5">
                              Không giới hạn
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="pt-3 border-t border-border/40 flex items-end justify-between gap-2">
                        <div>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase leading-none mb-1">
                            Giá bán thực tế
                          </p>
                          <div className="flex items-baseline gap-2 flex-wrap">
                            <span className="font-mono font-black text-xl text-primary tracking-tight">
                              {formatVND(sellingPrice)}
                            </span>
                            {originalPrice > sellingPrice && (
                              <span className="text-xs text-muted-foreground line-through font-medium font-mono">
                                {formatVND(originalPrice)}
                              </span>
                            )}
                          </div>
                        </div>

                        {discountPct && (
                          <span className="inline-flex items-center gap-1 text-xs font-black bg-rose-500 text-white px-2 py-0.5 rounded-full shadow-2xs">
                            <BadgePercent className="h-3 w-3" />
                            -{discountPct}%
                          </span>
                        )}
                      </div>
                    </CardContent>

                    <div className="p-3 bg-muted/40 border-t border-border/40 flex items-center justify-between gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetail(pkg)}
                        className="rounded-lg text-xs font-semibold gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground hover:bg-background h-8 px-2.5"
                      >
                        <Eye className="h-3.5 w-3.5 text-primary" />
                        Chi tiết
                      </Button>
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/sales/course-packages/${pkg.id}`)}
                          className="rounded-lg text-xs font-semibold gap-1.5 cursor-pointer h-8 px-3 bg-background hover:bg-muted"
                        >
                          <Edit className="h-3.5 w-3.5 text-blue-600" />
                          Sửa
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteTarget(pkg)}
                          className="rounded-lg text-xs font-semibold gap-1.5 cursor-pointer h-8 px-2.5 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            /* ─── DATA TABLE VIEW ─── */
            <Table containerClassName="max-h-[calc(100vh-240px)] min-h-[280px] overflow-auto border-b border-border/20">
              <TableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur-md shadow-2xs border-b border-border/40">
                <TableRow className="border-b border-border/30 bg-muted/20 hover:bg-muted/20">
                  <TableHead className="w-10 pb-4">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={(checked) => handleSelectAllPackages(!!checked)}
                      className="translate-y-0.5 border-border/30"
                    />
                  </TableHead>

                  <TableHead className="pb-4 text-xs font-semibold uppercase tracking-wider">
                    <div className="pl-1 text-muted-foreground">Mã Code</div>
                  </TableHead>

                  <TableHead className="pb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Tên Gói bán & Khóa học gốc
                  </TableHead>

                  <TableHead className="pb-4 text-xs font-semibold uppercase tracking-wider text-center text-muted-foreground">
                    Hình thức
                  </TableHead>

                  <TableHead className="pb-4 text-xs font-semibold uppercase tracking-wider text-center">
                    <div className="flex items-center gap-1.5 justify-center text-muted-foreground">
                      <Users className="h-3.5 w-3.5 text-indigo-500" />
                      <span>Số người / Lớp học</span>
                    </div>
                  </TableHead>

                  <TableHead
                    className="cursor-pointer pb-4 select-none text-xs font-semibold uppercase tracking-wider text-center group"
                    onClick={handleToggleSortOrder}
                  >
                    <div className="flex items-center gap-1.5 justify-center">
                      <span className="text-primary font-bold">Thời gian tạo</span>
                      {sortOrder === "asc" ? (
                        <ArrowUp className="h-3.5 w-3.5 text-primary" />
                      ) : (
                        <ArrowDown className="h-3.5 w-3.5 text-primary" />
                      )}
                    </div>
                  </TableHead>

                  <TableHead className="pb-4 text-xs font-semibold uppercase tracking-wider text-center text-muted-foreground">
                    Giá bán & Ưu đãi
                  </TableHead>

                  <TableHead className="pb-4 text-xs font-semibold uppercase tracking-wider text-center text-muted-foreground">
                    Trạng thái
                  </TableHead>

                  <TableHead className="text-xs text-center pb-4 font-semibold text-muted-foreground uppercase tracking-wider">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody className="opacity-90">
                {packages.map((pkg) => {
                  const { sellingPrice, originalPrice } = extractPackagePrices(pkg);
                  const discountPct = getDiscountPercent(originalPrice, sellingPrice);
                  const isInactive = pkg.status === "INACTIVE";
                  const isChecked = selectedPackageIds.includes(String(pkg.id));

                  return (
                    <TableRow
                      key={pkg.id}
                      className={cn(
                        "transition-all duration-200 border-b border-border/30 hover:bg-muted/30",
                        isInactive && "opacity-75 bg-muted/10",
                        isChecked && "bg-primary/5"
                      )}
                    >
                      <TableCell>
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => handleSelectPackage(String(pkg.id))}
                          className="translate-y-0.5 border-border/30"
                        />
                      </TableCell>

                      <TableCell className="font-mono font-bold text-primary text-xs pl-1">
                        <span className="px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20">
                          {pkg.code || pkg.id}
                        </span>
                      </TableCell>

                      <TableCell>
                        <div className="space-y-0.5 max-w-xs">
                          <p
                            onClick={() => handleViewDetail(pkg)}
                            className="font-semibold text-foreground hover:text-primary cursor-pointer transition-colors text-sm line-clamp-1"
                            title={pkg.name}
                          >
                            {pkg.name}
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1.5 truncate">
                            <BookOpen className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                            <span className="truncate">{pkg.courseName || "Khóa học gốc"}</span>
                          </p>
                        </div>
                      </TableCell>

                      <TableCell className="text-center">
                        {renderDeliveryBadge(pkg.deliveryMode)}
                      </TableCell>

                      <TableCell className="text-center font-mono text-xs">
                        <div className="flex flex-col items-center justify-center gap-1">
                          {pkg.deliveryMode === "ONE_ON_ONE" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20 font-bold">
                              <UserCheck className="h-3 w-3 text-purple-600 shrink-0" />
                              1 HV (Kèm 1-1)
                            </span>
                          ) : pkg.deliveryMode === "SELF_STUDY" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 font-bold">
                              <GraduationCap className="h-3 w-3 text-emerald-600 shrink-0" />
                              Không giới hạn
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 font-bold">
                              <Users className="h-3 w-3 text-amber-600 shrink-0" />
                              Tối đa {pkg.maxGroupSize || 20} HV/lớp
                            </span>
                          )}

                          {pkg.className && (
                            <span className="text-[11px] text-muted-foreground font-medium truncate max-w-[130px]" title={`Lớp: ${pkg.className}`}>
                              Lớp: {pkg.className}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="text-center font-mono font-medium text-xs text-muted-foreground">
                        {formatDate(pkg.createdAt)}
                      </TableCell>

                      <TableCell className="text-center">
                        <div className="flex flex-col items-center justify-center">
                          <div className="flex items-center gap-1.5 flex-wrap justify-center">
                            <span className="font-mono font-black text-sm text-primary">
                              {formatVND(sellingPrice)}
                            </span>
                            {discountPct && (
                              <Badge className="bg-rose-500 text-white font-black text-[10px] px-1.5 py-0.2 rounded-full">
                                -{discountPct}%
                              </Badge>
                            )}
                          </div>
                          {originalPrice > sellingPrice && (
                            <span className="text-[11px] text-muted-foreground line-through font-mono font-medium">
                              {formatVND(originalPrice)}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <StatusBadge status={pkg.status} size="sm" />
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(pkg)}
                            className={cn(
                              "w-8 h-4.5 rounded-full transition-colors relative p-0.5 cursor-pointer focus:outline-hidden",
                              pkg.status === "ACTIVE"
                                ? "bg-emerald-500 hover:bg-emerald-600"
                                : "bg-zinc-300 dark:bg-zinc-700 hover:bg-zinc-400"
                            )}
                          >
                            <div
                              className={cn(
                                "h-3.5 w-3.5 rounded-full bg-white shadow-2xs transition-transform",
                                pkg.status === "ACTIVE" ? "translate-x-3.5" : "translate-x-0"
                              )}
                            />
                          </button>
                        </div>
                      </TableCell>

                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            onClick={() => handleViewDetail(pkg)}
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-primary hover:bg-primary/10 cursor-pointer"
                            title="Xem thông số chi tiết"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          <Button
                            onClick={() => navigate(`/sales/course-packages/${pkg.id}`)}
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-blue-600 hover:bg-blue-500/10 cursor-pointer"
                            title="Sửa cấu hình gói"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>

                          <Button
                            onClick={() => setDeleteTarget(pkg)}
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                            title="Xóa gói học"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          {/* 5. Fixed Table Footer & Pagination */}
          {packages.length > 0 && (
            <div className="px-5 py-3 border-t border-border/40 bg-card flex flex-col md:flex-row items-center justify-between gap-4 text-sm font-medium">
              <div className="text-muted-foreground text-xs sm:text-sm">
                Hiển thị <span className="font-semibold text-foreground">{page * pageSize + 1}</span> đến{" "}
                <span className="font-semibold text-foreground">{Math.min((page + 1) * pageSize, totalElements)}</span> trên{" "}
                <span className="font-semibold text-foreground">{totalElements}</span> bản ghi
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-xs">Số gói/trang:</span>
                  <Select value={String(pageSize)} onValueChange={(val) => { setPageSize(Number(val)); setPage(0); }}>
                    <SelectTrigger className="h-8 w-16 text-xs bg-background border border-border rounded-lg font-bold">
                      <SelectValue placeholder={String(pageSize)} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="9">9</SelectItem>
                      <SelectItem value="18">18</SelectItem>
                      <SelectItem value="27">27</SelectItem>
                      <SelectItem value="45">45</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const pNum = parseInt(jumpPageInput, 10);
                    if (!isNaN(pNum) && pNum >= 1 && pNum <= totalPages) setPage(pNum - 1);
                  }}
                  className="flex items-center gap-1.5"
                >
                  <span className="text-muted-foreground text-xs">Tới trang:</span>
                  <Input
                    type="number"
                    min={1}
                    max={totalPages || 1}
                    value={jumpPageInput}
                    onChange={(e) => setJumpPageInput(e.target.value)}
                    className="h-8 w-14 text-center text-xs font-bold bg-background border border-border rounded-lg"
                  />
                </form>

                <div className="flex items-center gap-1">
                  <Button
                    disabled={page === 0}
                    onClick={() => setPage((p) => p - 1)}
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs font-semibold rounded-lg cursor-pointer"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" /> Trước
                  </Button>
                  {getPageNumbers(page, totalPages).map((p, idx) => {
                    if (p === "...")
                      return (
                        <span key={`dots-${idx}`} className="px-1 text-muted-foreground text-xs font-bold">
                          ...
                        </span>
                      );
                    const pageNum = p as number;
                    const isCurrent = pageNum === page;
                    return (
                      <Button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        variant={isCurrent ? "default" : "outline"}
                        size="sm"
                        className="h-8 w-8 text-xs font-semibold rounded-lg cursor-pointer"
                      >
                        {pageNum + 1}
                      </Button>
                    );
                  })}
                  <Button
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage((p) => p + 1)}
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs font-semibold rounded-lg cursor-pointer"
                  >
                    Sau <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Card>
      </section>

      {/* 🌟 6. FULL RESPONSE DETAIL MODAL (Matching CoursePackageResponse) 🌟 */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Info className="h-4 w-4 text-primary" />
              Chi tiết Gói bán Khóa học (CoursePackageResponse)
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Thông số chi tiết đầy đủ các trường thuộc tính từ máy chủ
            </DialogDescription>
          </DialogHeader>

          {detailLoading ? (
            <div className="space-y-3 py-4 animate-pulse">
              <div className="h-6 bg-muted rounded w-2/3" />
              <div className="h-4 bg-muted rounded w-1/2" />
              <div className="grid grid-cols-2 gap-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-16 bg-muted rounded-lg" />
                ))}
              </div>
            </div>
          ) : detail ? (
            <div className="space-y-4 py-2 text-xs">
              {/* Header Title & Badges */}
              <div className="space-y-2 pb-3 border-b border-border/40">
                <div className="flex items-center gap-2 flex-wrap">
                  {renderDeliveryBadge(detail.deliveryMode)}
                  <StatusBadge status={detail.status} size="sm" />
                  <span className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary border border-primary/20 font-mono font-bold">
                    Mã code: {detail.code || detail.id}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-muted text-muted-foreground border border-border/60 font-mono">
                    ID: {detail.id}
                  </span>
                </div>
                <h2 className="text-lg font-extrabold text-foreground tracking-tight">{detail.name}</h2>
              </div>

              {/* Description */}
              {detail.description && (
                <div className="space-y-1">
                  <p className="font-bold text-muted-foreground uppercase text-[10px]">Mô tả sản phẩm</p>
                  <p className="text-xs text-foreground bg-muted/40 rounded-xl p-3 leading-relaxed border border-border/40">
                    {detail.description}
                  </p>
                </div>
              )}

              {/* Grid 1: Course & Class Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-muted/30 rounded-xl p-3 space-y-1 border border-border/40">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                    <BookOpen className="h-3 w-3 text-indigo-500" /> Khóa học gốc (Course)
                  </p>
                  <p className="font-bold text-foreground text-sm">{detail.courseName || "Chưa xác định"}</p>
                  <p className="text-[10px] font-mono text-muted-foreground">courseId: {detail.courseId || "—"}</p>
                </div>

                <div className="bg-muted/30 rounded-xl p-3 space-y-1 border border-border/40">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                    <GraduationCap className="h-3 w-3 text-purple-500" /> Lớp học đính kèm (Class)
                  </p>
                  <p className="font-bold text-foreground text-sm">{detail.className || "Không có (Chưa gắn lớp)"}</p>
                  <p className="text-[10px] font-mono text-muted-foreground">classId: {detail.classId || "—"}</p>
                </div>
              </div>

              {/* Grid 2: Pricing & Discount */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-primary/5 rounded-xl p-3 space-y-1 border border-primary/20">
                  <p className="text-[10px] font-bold text-primary uppercase">Giá bán thực tế (price)</p>
                  <p className="text-lg font-black font-mono text-primary">{formatVND(detail.price)}</p>
                </div>

                <div className="bg-muted/30 rounded-xl p-3 space-y-1 border border-border/40">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Giá niêm yết (originalPrice)</p>
                  <p className="text-base font-bold font-mono text-muted-foreground line-through">
                    {formatVND(detail.originalPrice)}
                  </p>
                </div>

                <div className="bg-rose-500/10 rounded-xl p-3 space-y-1 border border-rose-500/20">
                  <p className="text-[10px] font-bold text-rose-700 dark:text-rose-400 uppercase">Ưu đãi (discountPercentage)</p>
                  <p className="text-base font-black font-mono text-rose-600 dark:text-rose-400">
                    {detail.discountPercentage != null ? `${detail.discountPercentage}%` : "0%"}
                  </p>
                </div>
              </div>

              {/* Grid 3: Capacities, Sessions & Duration */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-muted/30 rounded-xl p-2.5 space-y-0.5 border border-border/40">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Sĩ số hiện tại</p>
                  <p className="font-mono font-bold text-foreground">
                    {detail.currentMemberCount != null ? detail.currentMemberCount : "—"}
                  </p>
                </div>

                <div className="bg-muted/30 rounded-xl p-2.5 space-y-0.5 border border-border/40">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Sĩ số tối đa (maxMembers)</p>
                  <p className="font-mono font-bold text-foreground">
                    {detail.maxMembers != null ? detail.maxMembers : detail.maxGroupSize != null ? detail.maxGroupSize : "—"}
                  </p>
                </div>

                <div className="bg-muted/30 rounded-xl p-2.5 space-y-0.5 border border-border/40">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Buổi kèm (tutorSessions)</p>
                  <p className="font-mono font-bold text-foreground">
                    {detail.includedTutorSessions != null ? detail.includedTutorSessions : 0} buổi
                  </p>
                </div>

                <div className="bg-muted/30 rounded-xl p-2.5 space-y-0.5 border border-border/40">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Thời hạn (durationDays)</p>
                  <p className="font-mono font-bold text-foreground">
                    {detail.durationDays ? `${detail.durationDays} ngày` : "Vô hạn"}
                  </p>
                </div>
              </div>

              {/* Grid 4: Timestamps & Audit Info */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-border/40 text-[11px]">
                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold">Thời gian tạo (createdAt)</p>
                  <p className="font-mono font-bold">{formatDate(detail.createdAt)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold">Cập nhật (updatedAt)</p>
                  <p className="font-mono font-bold">{formatDate(detail.updatedAt)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold">Người tạo (createdBy)</p>
                  <p className="font-mono font-bold">{detail.createdBy != null ? detail.createdBy : "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold">Người cập nhật (updatedBy)</p>
                  <p className="font-mono font-bold">{detail.updatedBy != null ? detail.updatedBy : "—"}</p>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/40">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDetailOpen(false)}
                  className="rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Đóng
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setDetailOpen(false);
                    navigate(`/sales/course-packages/${detail!.id}`);
                  }}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs font-semibold gap-1.5 cursor-pointer"
                >
                  <Edit className="h-3.5 w-3.5" />
                  Chỉnh sửa Gói học
                </Button>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground text-sm">
              Không tải được thông tin chi tiết gói học.
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 7. Delete Confirm Dialog */}
      <Dialog open={Boolean(deleteTarget)} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-rose-600">
              <AlertTriangle className="h-4 w-4" />
              Xác nhận xóa Gói học
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Thao tác này không thể hoàn tác. Dữ liệu gói học sẽ bị xóa hoàn toàn khỏi hệ thống.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <div className="bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-xl p-3">
              <p className="text-sm font-bold text-foreground">{deleteTarget?.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{deleteTarget?.courseName}</p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteTarget(null)}
              disabled={deleteLoading}
              className="rounded-xl text-xs font-semibold cursor-pointer"
            >
              Hủy
            </Button>
            <Button
              size="sm"
              onClick={handleDeleteConfirm}
              disabled={deleteLoading}
              className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold gap-1.5 cursor-pointer"
            >
              {deleteLoading ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
              Xác nhận xóa
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
