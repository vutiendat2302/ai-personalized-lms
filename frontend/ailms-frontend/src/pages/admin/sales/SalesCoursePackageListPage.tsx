import React, { useState, useEffect } from "react";
import {
  salesApi,
  type CoursePackageItem,
  type CoursePackageDetail,
  type DeliveryModeEnum,
} from "@/api/sales/salesApi";
import { StatusBadge } from "@/components/sales/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  Package,
  Plus,
  Search,
  RefreshCw,
  Edit,
  Trash2,
  Eye,
  CheckCircle2,
  BookOpen,
  Clock,
  Users,
  Calendar,
  Info,
  AlertTriangle,
  GraduationCap,
  Sparkles,
  Radio,
  Layers,
  BadgePercent,
  UserCheck,
  ShieldCheck,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/useToast";

const formatVND = (val?: number | string) => {
  if (val == null) return "—";
  const num = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(num)) return "—";
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(num);
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
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-extrabold uppercase rounded-full bg-violet-100/90 text-violet-800 border border-violet-300/80 dark:bg-violet-950/80 dark:text-violet-300 dark:border-violet-800 shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
          Kèm 1-1
        </span>
      );
    case "LIVE_CLASS":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-extrabold uppercase rounded-full bg-blue-100/90 text-blue-800 border border-blue-300/80 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-800 shadow-xs">
          <Radio className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 animate-pulse" />
          Lớp Online Live
        </span>
      );
    case "HYBRID":
    case "GROUP_CLASS":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-extrabold uppercase rounded-full bg-amber-100/90 text-amber-800 border border-amber-300/80 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800 shadow-xs">
          <Layers className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          Hybrid
        </span>
      );
    case "SELF_PACED":
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-extrabold uppercase rounded-full bg-emerald-100/90 text-emerald-800 border border-emerald-300/80 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800 shadow-xs">
          <GraduationCap className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          Tự học
        </span>
      );
  }
};

const getDeliveryGradient = (mode: DeliveryModeEnum | string) => {
  switch (mode) {
    case "ONE_ON_ONE":
      return "from-violet-500 via-purple-500 to-indigo-500";
    case "LIVE_CLASS":
      return "from-blue-500 via-sky-500 to-cyan-500";
    case "HYBRID":
    case "GROUP_CLASS":
      return "from-amber-500 via-orange-500 to-yellow-500";
    case "SELF_PACED":
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

  const [packages, setPackages] = useState<CoursePackageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [deliveryModeFilter, setDeliveryModeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // View Mode & Pagination State
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(6);
  const [jumpPageInput, setJumpPageInput] = useState("1");

  // Detail modal state
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<CoursePackageDetail | null>(null);

  // Delete confirm state
  const [deleteTarget, setDeleteTarget] = useState<CoursePackageItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchPackages = async () => {
    setLoading(true);
    try {
      const data = await salesApi.getCoursePackages();
      setPackages(data);
    } catch {
      error("Không thể tải danh sách gói học");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  useEffect(() => {
    setPage(0);
  }, [searchTerm, deliveryModeFilter, statusFilter]);

  useEffect(() => {
    setJumpPageInput(String(page + 1));
  }, [page]);

  const handleViewDetail = async (pkg: CoursePackageItem) => {
    setDetailOpen(true);
    setDetailLoading(true);

    const { sellingPrice, originalPrice } = extractPackagePrices(pkg);

    const fallbackDetail: CoursePackageDetail = {
      id: String(pkg.id),
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
    };

    try {
      const d = await salesApi.getCoursePackageById(pkg.id);
      if (d) {
        const dPrices = extractPackagePrices(d);
        setDetail({
          ...d,
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

  const handleToggleStatus = async (pkg: CoursePackageItem) => {
    const nextStatus = pkg.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    setPackages((prev) =>
      prev.map((p) => (p.id === pkg.id ? { ...p, status: nextStatus as any } : p))
    );
    const ok = await salesApi.toggleCoursePackageStatus(pkg.id, nextStatus as "ACTIVE" | "INACTIVE");
    if (ok) {
      success(
        nextStatus === "INACTIVE"
          ? `Đã ẩn gói "${pkg.name}"`
          : `Đã kích hoạt gói "${pkg.name}"`
      );
    } else {
      // revert
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
      success(`Đã xóa gói "${deleteTarget.name}"`);
    } else {
      error("Không thể xóa gói học. Vui lòng thử lại.");
    }
    setDeleteTarget(null);
  };

  const filteredPackages = packages.filter((pkg) => {
    if (deliveryModeFilter !== "ALL" && pkg.deliveryMode !== deliveryModeFilter) return false;
    if (statusFilter !== "ALL" && pkg.status !== statusFilter) return false;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      if (
        !pkg.name.toLowerCase().includes(term) &&
        !pkg.courseName.toLowerCase().includes(term)
      )
        return false;
    }
    return true;
  });

  const activeCount = packages.filter((p) => p.status === "ACTIVE").length;
  const inactiveCount = packages.filter((p) => p.status === "INACTIVE").length;

  const totalElements = filteredPackages.length;
  const totalPages = Math.ceil(totalElements / pageSize) || 1;
  const paginatedPackages = filteredPackages.slice(page * pageSize, (page + 1) * pageSize);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Quản lý Gói bán khóa học
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Cấu hình giá bán, hình thức đào tạo và trạng thái phân phối sản phẩm
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchPackages}
            disabled={loading}
            className="rounded-lg gap-2 cursor-pointer text-xs font-semibold"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Làm mới
          </Button>
          <Link to="/sales/course-packages/new">
            <Button
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg gap-2 cursor-pointer text-xs font-semibold shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" />
              Tạo Gói học mới
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border/40 rounded-xl p-4 text-center">
          <p className="text-2xl font-black text-foreground">{packages.length}</p>
          <p className="text-xs text-muted-foreground font-semibold mt-0.5">Tổng gói học</p>
        </div>
        <div className="bg-card border border-emerald-200/60 dark:border-emerald-800 rounded-xl p-4 text-center">
          <p className="text-2xl font-black text-emerald-600">{activeCount}</p>
          <p className="text-xs text-muted-foreground font-semibold mt-0.5">Đang hoạt động</p>
        </div>
        <div className="bg-card border border-zinc-200/60 dark:border-zinc-800 rounded-xl p-4 text-center">
          <p className="text-2xl font-black text-zinc-500">{inactiveCount}</p>
          <p className="text-xs text-muted-foreground font-semibold mt-0.5">Đã ẩn</p>
        </div>
      </div>

      {/* Filter & View Mode Bar */}
      <div className="bg-card p-4 rounded-xl border border-border/50 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto flex-1">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm theo tên Gói học hoặc Khóa học gốc..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 text-xs h-9 bg-card"
            />
          </div>
          <select
            value={deliveryModeFilter}
            onChange={(e) => setDeliveryModeFilter(e.target.value)}
            className="h-9 w-full sm:w-auto text-xs bg-card border border-border/60 rounded-lg px-3 text-foreground font-medium"
          >
            <option value="ALL">Tất cả hình thức</option>
            <option value="SELF_PACED">Tự học (Self-Paced)</option>
            <option value="LIVE_CLASS">Lớp Online Live</option>
            <option value="HYBRID">Hybrid</option>
            <option value="ONE_ON_ONE">Kèm 1-1</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 w-full sm:w-auto text-xs bg-card border border-border/60 rounded-lg px-3 text-foreground font-medium"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang hoạt động</option>
            <option value="INACTIVE">Đã ẩn</option>
            <option value="OUT_OF_STOCK">Hết chỗ</option>
          </select>
        </div>

        {/* View Mode Toggle Switch */}
        <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border/50 shrink-0 self-end sm:self-auto">
          <Button
            type="button"
            variant={viewMode === "grid" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("grid")}
            className={`h-7 px-2.5 text-xs gap-1.5 rounded-md cursor-pointer ${
              viewMode === "grid"
                ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="Xem dạng Lưới (Cards)"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Lưới
          </Button>
          <Button
            type="button"
            variant={viewMode === "list" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("list")}
            className={`h-7 px-2.5 text-xs gap-1.5 rounded-md cursor-pointer ${
              viewMode === "list"
                ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="Xem dạng Danh sách (Bảng)"
          >
            <List className="h-3.5 w-3.5" />
            Danh sách
          </Button>
        </div>
      </div>

      {/* Loading skeleton */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card border border-border/40 rounded-2xl p-5 space-y-3 animate-pulse">
              <div className="flex justify-between">
                <div className="h-6 w-24 bg-muted rounded-full" />
                <div className="h-6 w-16 bg-muted rounded-full" />
              </div>
              <div className="h-5 w-3/4 bg-muted rounded" />
              <div className="h-4 w-1/2 bg-muted rounded" />
              <div className="h-8 w-full bg-muted rounded" />
            </div>
          ))}
        </div>
      ) : filteredPackages.length === 0 ? (
        <div className="p-16 text-center text-muted-foreground bg-card rounded-xl border border-border/40">
          <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-semibold">Chưa có gói học nào phù hợp</p>
          <p className="text-xs mt-1">Thêm gói học mới hoặc thay đổi bộ lọc</p>
        </div>
      ) : viewMode === "grid" ? (
        /* ─── GRID VIEW (CARD GRID) ─── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {paginatedPackages.map((pkg) => {
            const { sellingPrice, originalPrice } = extractPackagePrices(pkg);
            const discountPct = getDiscountPercent(originalPrice, sellingPrice);
            const isInactive = pkg.status === "INACTIVE";

            const displayFeatures = pkg.features && pkg.features.length > 0
              ? pkg.features
              : [
                  "Đầy đủ bài giảng & tài nguyên học tập",
                  "Hỗ trợ giải đáp & tương tác trực tiếp",
                  "Cấp chứng chỉ sau khi hoàn thành khóa",
                ];

            return (
              <Card
                key={pkg.id}
                className={`group relative border rounded-2xl overflow-hidden bg-card flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 hover:shadow-lg ${
                  isInactive
                    ? "border-dashed border-border/50 bg-muted/20 opacity-80"
                    : "border-border/60 hover:border-indigo-300 dark:hover:border-indigo-800"
                }`}
              >
                {/* Top Accent Gradient Bar */}
                <div className={`h-1.5 w-full bg-linear-to-r ${getDeliveryGradient(pkg.deliveryMode)}`} />

                <CardContent className="p-5 space-y-4">
                  {/* Header Row: Delivery Badge + Status + Quick Switch */}
                  <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-3">
                    {renderDeliveryBadge(pkg.deliveryMode)}

                    <div className="flex items-center g
                    ap-2">
                      <StatusBadge status={pkg.status} size="sm" />

                      {/* Quick toggle switch */}
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(pkg)}
                        title={pkg.status === "ACTIVE" ? "Click để ẩn gói học" : "Click để kích hoạt gói học"}
                        className={`w-9 h-5 rounded-full transition-colors relative p-0.5 cursor-pointer focus:outline-hidden ${
                          pkg.status === "ACTIVE"
                            ? "bg-emerald-500 hover:bg-emerald-600"
                            : "bg-zinc-300 dark:bg-zinc-700 hover:bg-zinc-400"
                        }`}
                      >
                        <div
                          className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                            pkg.status === "ACTIVE" ? "translate-x-4" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Package Name & Course Info */}
                  <div className="space-y-1.5">
                    <h3 className="font-extrabold text-base text-foreground leading-snug tracking-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2">
                      {pkg.name}
                    </h3>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/60 text-xs text-muted-foreground font-medium max-w-full truncate">
                      <BookOpen className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                      <span className="truncate">{pkg.courseName}</span>
                    </div>
                  </div>

                  {/* Key Specs Row */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                      <Clock className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[10px] text-muted-foreground font-semibold uppercase leading-none">Thời hạn</p>
                        <p className="text-xs font-bold text-foreground truncate mt-0.5">
                          {pkg.durationDays ? `${pkg.durationDays} ngày` : "Trọn đời"}
                        </p>
                      </div>
                    </div>

                    {pkg.includedTutorSessions != null && pkg.includedTutorSessions > 0 ? (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-violet-50 dark:bg-violet-950/40 border border-violet-100 dark:border-violet-900/50">
                        <UserCheck className="h-3.5 w-3.5 text-violet-500 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[10px] text-muted-foreground font-semibold uppercase leading-none">Buổi kèm 1-1</p>
                          <p className="text-xs font-bold text-violet-700 dark:text-violet-300 truncate mt-0.5">
                            {pkg.includedTutorSessions} buổi
                          </p>
                        </div>
                      </div>
                    ) : pkg.maxGroupSize != null && pkg.maxGroupSize > 0 ? (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/50">
                        <Users className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[10px] text-muted-foreground font-semibold uppercase leading-none">Sĩ số lớp</p>
                          <p className="text-xs font-bold text-amber-700 dark:text-amber-300 truncate mt-0.5">
                            Tối đa {pkg.maxGroupSize} HV
                          </p>
                        </div>
                      </div>
                    ) : pkg.className ? (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50">
                        <GraduationCap className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[10px] text-muted-foreground font-semibold uppercase leading-none">Lớp gán</p>
                          <p className="text-xs font-bold text-indigo-700 dark:text-indigo-300 truncate mt-0.5">
                            {pkg.className}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50">
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[10px] text-muted-foreground font-semibold uppercase leading-none">Bảo hành</p>
                          <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300 truncate mt-0.5">
                            Cập nhật free
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Features Checklist */}
                  <div className="space-y-1.5 pt-1">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                      Đặc quyền gói bán
                    </p>
                    <div className="space-y-1 text-xs text-foreground/90">
                      {displayFeatures.slice(0, 3).map((feat, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          <span className="truncate leading-tight text-xs">{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Price Section */}
                  <div className="pt-3 border-t border-border/40 flex items-end justify-between gap-2">
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase leading-none mb-1">
                        Giá ưu đãi hiện tại
                      </p>
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="font-black text-xl text-indigo-600 dark:text-indigo-400 tracking-tight">
                          {formatVND(sellingPrice)}
                        </span>
                        {originalPrice > sellingPrice && (
                          <span className="text-xs text-muted-foreground line-through font-medium">
                            {formatVND(originalPrice)}
                          </span>
                        )}
                      </div>
                    </div>

                    {discountPct && (
                      <span className="inline-flex items-center gap-1 text-xs font-black bg-rose-500 text-white px-2 py-0.5 rounded-full shadow-xs shrink-0 animate-bounce-short">
                        <BadgePercent className="h-3 w-3" />
                        -{discountPct}%
                      </span>
                    )}
                  </div>
                </CardContent>

                {/* Footer Actions */}
                <div className="p-3 bg-muted/40 border-t border-border/40 flex items-center justify-between gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleViewDetail(pkg)}
                    className="rounded-lg text-xs font-semibold gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground hover:bg-background h-8 px-2.5"
                    title="Xem thông số chi tiết"
                  >
                    <Eye className="h-3.5 w-3.5 text-indigo-500" />
                    Chi tiết
                  </Button>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/sales/course-packages/${pkg.id}`)}
                      className="rounded-lg text-xs font-semibold gap-1.5 cursor-pointer h-8 px-3 bg-background hover:bg-muted"
                      title="Chỉnh sửa cấu hình gói"
                    >
                      <Edit className="h-3.5 w-3.5 text-slate-600 dark:text-slate-300" />
                      Sửa
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteTarget(pkg)}
                      className="rounded-lg text-xs font-semibold gap-1.5 cursor-pointer h-8 px-2.5 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60"
                      title="Xóa gói học"
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
        /* ─── LIST VIEW (TABLE VIEW) ─── */
        <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-xs">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="border-b border-border/40">
                <TableHead className="w-40 font-bold text-xs">Hình thức</TableHead>
                <TableHead className="font-bold text-xs">Tên Gói & Khóa học</TableHead>
                <TableHead className="w-36 font-bold text-xs">Thời hạn / Specs</TableHead>
                <TableHead className="w-44 font-bold text-xs">Giá bán & Ưu đãi</TableHead>
                <TableHead className="w-32 font-bold text-xs text-center">Trạng thái</TableHead>
                <TableHead className="w-32 text-right font-bold text-xs pr-4">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedPackages.map((pkg) => {
                const { sellingPrice, originalPrice } = extractPackagePrices(pkg);
                const discountPct = getDiscountPercent(originalPrice, sellingPrice);
                const isInactive = pkg.status === "INACTIVE";

                return (
                  <TableRow
                    key={pkg.id}
                    className={`border-b border-border/30 hover:bg-muted/30 transition-colors ${
                      isInactive ? "opacity-75 bg-muted/10" : ""
                    }`}
                  >
                    {/* Delivery Mode */}
                    <TableCell className="py-3.5">
                      <div className="space-y-1">
                        {renderDeliveryBadge(pkg.deliveryMode)}
                        {pkg.className && (
                          <div className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
                            <GraduationCap className="h-3 w-3 text-indigo-500" />
                            <span className="truncate">{pkg.className}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>

                    {/* Package Name & Course */}
                    <TableCell className="py-3.5">
                      <div className="space-y-1">
                        <p className="font-bold text-sm text-foreground hover:text-indigo-600 transition-colors line-clamp-1">
                          {pkg.name}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <BookOpen className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                          <span className="truncate font-medium">{pkg.courseName}</span>
                        </div>
                      </div>
                    </TableCell>

                    {/* Duration / Specs */}
                    <TableCell className="py-3.5">
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-1.5 text-foreground font-semibold">
                          <Clock className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                          <span>{pkg.durationDays ? `${pkg.durationDays} ngày` : "Trọn đời"}</span>
                        </div>
                        {pkg.includedTutorSessions != null && pkg.includedTutorSessions > 0 && (
                          <div className="text-[11px] text-violet-600 font-bold flex items-center gap-1">
                            <UserCheck className="h-3 w-3" />
                            <span>{pkg.includedTutorSessions} buổi kèm 1-1</span>
                          </div>
                        )}
                      </div>
                    </TableCell>

                    {/* Price & Discount */}
                    <TableCell className="py-3.5">
                      <div className="space-y-0.5">
                        <div className="flex items-baseline gap-1.5 flex-wrap">
                          <span className="font-black text-sm text-indigo-600 dark:text-indigo-400">
                            {formatVND(sellingPrice)}
                          </span>
                          {discountPct && (
                            <span className="text-[10px] font-black bg-rose-500 text-white px-1.5 py-0.2 rounded-full">
                              -{discountPct}%
                            </span>
                          )}
                        </div>
                        {originalPrice > sellingPrice && (
                          <p className="text-[11px] text-muted-foreground line-through font-medium">
                            {formatVND(originalPrice)}
                          </p>
                        )}
                      </div>
                    </TableCell>

                    {/* Status & Switch */}
                    <TableCell className="py-3.5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <StatusBadge status={pkg.status} size="sm" />
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(pkg)}
                          title={pkg.status === "ACTIVE" ? "Click để ẩn gói học" : "Click để kích hoạt gói học"}
                          className={`w-8 h-4.5 rounded-full transition-colors relative p-0.5 cursor-pointer focus:outline-hidden ${
                            pkg.status === "ACTIVE"
                              ? "bg-emerald-500 hover:bg-emerald-600"
                              : "bg-zinc-300 dark:bg-zinc-700 hover:bg-zinc-400"
                          }`}
                        >
                          <div
                            className={`h-3.5 w-3.5 rounded-full bg-white shadow-xs transition-transform ${
                              pkg.status === "ACTIVE" ? "translate-x-3.5" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="py-3.5 text-right pr-4">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewDetail(pkg)}
                          className="h-8 w-8 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950 cursor-pointer"
                          title="Xem chi tiết"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/sales/course-packages/${pkg.id}`)}
                          className="h-8 w-8 text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                          title="Chỉnh sửa"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteTarget(pkg)}
                          className="h-8 w-8 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950 cursor-pointer"
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
        </div>
      )}

      {/* ─── Pagination Footer (Role Page Style) ─── */}
      {filteredPackages.length > 0 && (
        <div className="px-5 py-3 border border-border/40 bg-card rounded-xl shadow-xs flex flex-col md:flex-row items-center justify-between gap-4 text-sm font-medium">
          <div className="text-muted-foreground text-xs sm:text-sm">
            Hiển thị{" "}
            <span className="font-semibold text-foreground">
              {totalElements === 0 ? 0 : page * pageSize + 1}
            </span>{" "}
            đến{" "}
            <span className="font-semibold text-foreground">
              {Math.min((page + 1) * pageSize, totalElements)}
            </span>{" "}
            trên <span className="font-semibold text-foreground">{totalElements}</span> bản ghi
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-xs">Số gói/trang:</span>
              <select
                value={String(pageSize)}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(0);
                }}
                className="h-8 text-xs bg-card border border-border/60 rounded-lg font-bold px-2 text-foreground cursor-pointer"
              >
                <option value="6">6</option>
                <option value="12">12</option>
                <option value="24">24</option>
                <option value="50">50</option>
              </select>
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
                className="h-8 w-14 text-center text-xs font-bold bg-card border border-border/60 rounded-lg"
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
                    className={`h-8 w-8 text-xs font-semibold rounded-lg cursor-pointer ${
                      isCurrent ? "bg-indigo-600 hover:bg-indigo-700 text-white" : ""
                    }`}
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

      {/* ─── Detail Dialog ─── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Info className="h-4 w-4 text-indigo-500" />
              Thông tin chi tiết Gói học
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Xem đầy đủ cấu hình và thông số kỹ thuật của gói bán khóa học này
            </DialogDescription>
          </DialogHeader>

          {detailLoading ? (
            <div className="space-y-3 py-4 animate-pulse">
              <div className="h-6 bg-muted rounded w-2/3" />
              <div className="h-4 bg-muted rounded w-1/2" />
              <div className="grid grid-cols-2 gap-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-16 bg-muted rounded-lg" />
                ))}
              </div>
            </div>
          ) : detail ? (
            <div className="space-y-4 py-2">
              {/* Header info */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  {renderDeliveryBadge(detail.deliveryMode)}
                  <StatusBadge status={detail.status} size="sm" />
                </div>
                <h2 className="text-lg font-bold text-foreground">{detail.name}</h2>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <BookOpen className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                  <span>{detail.courseName}</span>
                </div>
                {detail.className && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <GraduationCap className="h-3.5 w-3.5 text-violet-500 shrink-0" />
                    <span>Lớp: {detail.className}</span>
                  </div>
                )}
              </div>

              {detail.description && (
                <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-3 leading-relaxed">
                  {detail.description}
                </p>
              )}

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/40 rounded-xl p-3 space-y-1">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Giá bán</p>
                  <p className="text-base font-black text-indigo-600 dark:text-indigo-400">
                    {formatVND(detail.price)}
                  </p>
                </div>
                <div className="bg-muted/40 rounded-xl p-3 space-y-1">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Giá gốc</p>
                  <p className="text-base font-black text-muted-foreground line-through">
                    {formatVND(detail.originalPrice)}
                  </p>
                </div>
                {detail.durationDays != null && (
                  <div className="bg-muted/40 rounded-xl p-3 flex items-center gap-2.5">
                    <Calendar className="h-5 w-5 text-blue-500 shrink-0" />
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">Thời hạn</p>
                      <p className="text-sm font-bold">{detail.durationDays} ngày</p>
                    </div>
                  </div>
                )}
                {detail.includedTutorSessions != null && (
                  <div className="bg-muted/40 rounded-xl p-3 flex items-center gap-2.5">
                    <Clock className="h-5 w-5 text-violet-500 shrink-0" />
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">Buổi kèm</p>
                      <p className="text-sm font-bold">{detail.includedTutorSessions} buổi</p>
                    </div>
                  </div>
                )}
                {detail.maxGroupSize != null && (
                  <div className="bg-muted/40 rounded-xl p-3 flex items-center gap-2.5">
                    <Users className="h-5 w-5 text-emerald-500 shrink-0" />
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">Sĩ số</p>
                      <p className="text-sm font-bold">Tối đa {detail.maxGroupSize} học viên</p>
                    </div>
                  </div>
                )}
                {detail.createdAt && (
                  <div className="bg-muted/40 rounded-xl p-3 flex items-center gap-2.5">
                    <Calendar className="h-5 w-5 text-amber-500 shrink-0" />
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">Tạo lúc</p>
                      <p className="text-sm font-bold">
                        {new Date(detail.createdAt).toLocaleDateString("vi-VN")}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDetailOpen(false)}
                  className="rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Đóng
                 </Button>
                 <Button
                   size="sm"
                   onClick={() => {
                     setDetailOpen(false);
                     navigate(`/sales/course-packages/${detail!.id}`);
                   }}
                   className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold gap-1.5 cursor-pointer"
                 >
                   <Edit className="h-3.5 w-3.5" />
                   Chỉnh sửa
                 </Button>
               </div>
             </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground text-sm">
              Không tải được thông tin gói học.
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirm Dialog ─── */}
      <Dialog open={Boolean(deleteTarget)} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-rose-600">
              <AlertTriangle className="h-4 w-4" />
              Xác nhận xóa Gói học
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Thao tác này không thể hoàn tác. Gói học sẽ bị xóa vĩnh viễn.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <div className="bg-rose-50 dark:bg-rose-950 border border-rose-200 dark:border-rose-800 rounded-lg p-3">
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
              className="rounded-lg text-xs font-semibold cursor-pointer"
            >
              Hủy
            </Button>
            <Button
              size="sm"
              onClick={handleDeleteConfirm}
              disabled={deleteLoading}
              className="bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold gap-1.5 cursor-pointer"
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
