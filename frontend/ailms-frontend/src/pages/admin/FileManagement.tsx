import React, { useEffect, useState, useMemo } from "react";
import { fileAdminApi } from "@/api/file/fileAdminApi";
import type {
  FileMetadataResponse,
  FileManagementSummaryResponse,
  FileSearchFilters,
  FileTypeEnum,
} from "@/types/fileManagement";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { FileDetailModal } from "@/components/admin/file/FileDetailModal";
import { FileUploadModal } from "@/components/admin/file/FileUploadModal";
import { formatBytes, formatDateTime, getUsageTypeBadge, getStatusBadge } from "@/components/admin/file/fileUtils";
import {
  HardDrive,
  Files,
  AlertTriangle,
  Calendar,
  Archive,
  DownloadCloud,
  Search,
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  FileCode,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ShieldAlert,
  Trash2,
  PieChart as PieChartIcon,
  TrendingUp,
  X,
  RotateCcw,
  RefreshCw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  UploadCloud,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

const USAGE_COLORS: Record<string, string> = {
  CONTRACT: "#4274d9",
  AVATAR: "#293681",
  QUIZ_ATTACHMENT: "#6366f1",
  ASSIGNMENT: "#2b5748",
  ASSIGNMENT_SUBMISSION: "#4274d9",
  LESSON_RESOURCE: "#14b8a6",
  LESSON_VIDEO: "#293681",
  COURSE_LESSON: "#06b6d4",
  POLICY: "#2b5748",
  OTHER: "#6b7280",
};

const DEFAULT_FILTERS: FileSearchFilters = {
  keyword: "",
  fileType: "ALL",
  usageType: "ALL",
  status: "ACTIVE",
  isOrphaned: "ALL",
  startDate: "",
  endDate: "",
  page: 0,
  size: 10,
  sortBy: "createdAt",
  sortDir: "DESC",
};

export const FileManagement: React.FC = () => {
  const [summary, setSummary] = useState<FileManagementSummaryResponse | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState(false);

  const [files, setFiles] = useState<FileMetadataResponse[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [totalElements, setTotalElements] = useState(0);

  // Loading states for individual actions
  const [loadingRescan, setLoadingRescan] = useState(false);
  const [loadingExport, setLoadingExport] = useState(false);

  // Filter state
  const [filters, setFilters] = useState<FileSearchFilters>(DEFAULT_FILTERS);

  // Confirm dialogs states for bulk actions
  const [confirmBulkArchiveOpen, setConfirmBulkArchiveOpen] = useState(false);
  const [confirmBulkDeleteOpen, setConfirmBulkDeleteOpen] = useState(false);
  const [confirmBulkPurgeOpen, setConfirmBulkPurgeOpen] = useState(false);

  // Pagination state matching Role Management
  const [jumpPageInput, setJumpPageInput] = useState("1");

  useEffect(() => {
    setJumpPageInput(String((filters.page || 0) + 1));
  }, [filters.page]);

  /** Tính toán danh sách trang hiển thị trong thanh phân trang */
  const getPageNumbers = (current: number, total: number) => {
    const pages: (number | string)[] = [];
    if (total <= 5) {
      for (let i = 0; i < total; i++) pages.push(i);
    } else {
      pages.push(0);
      if (current > 2) pages.push("...");
      const start = Math.max(1, current - 1);
      const end = Math.min(total - 2, current + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (current < total - 3) pages.push("...");
      pages.push(total - 1);
    }
    return pages;
  };

  // Selected files for bulk actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modal state
  const [selectedFileForModal, setSelectedFileForModal] = useState<FileMetadataResponse | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  // Action notification banner
  const [bannerMsg, setBannerMsg] = useState<{ text: string; isError?: boolean } | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);

  /** Lấy dữ liệu tổng quan thống kê dung lượng và trạng thái tệp tin */
  const fetchSummaryData = async () => {
    try {
      setLoadingSummary(true);
      setSummaryError(false);
      const data = await fileAdminApi.getSummary();
      setSummary(data);
    } catch (err) {
      console.error("Failed to load summary:", err);
      setSummary(null);
      setSummaryError(true);
    } finally {
      setLoadingSummary(false);
    }
  };

  /** Lấy danh sách tệp tin phân trang theo bộ lọc */
  const fetchFilesList = async () => {
    try {
      setLoadingFiles(true);
      const data = await fileAdminApi.getFiles(filters);
      setFiles(data.content || []);
      setTotalElements(data.totalElements || 0);
    } catch (err) {
      console.error("Failed to load files:", err);
    } finally {
      setLoadingFiles(false);
    }
  };

  useEffect(() => {
    fetchSummaryData();
  }, []);

  useEffect(() => {
    fetchFilesList();
  }, [filters]);

  /** Hiển thị thông báo banner toast thành công hoặc lỗi */
  const showBanner = (text: string, isError = false) => {
    setBannerMsg({ text, isError });
    setTimeout(() => setBannerMsg(null), 4000);
  };

  /** Đặt lại tất cả bộ lọc tìm kiếm về mặc định */
  const handleResetFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  /** Đảo chiều sắp xếp theo ngày tải lên */
  const toggleSortCreatedDate = () => {
    setFilters((prev) => {
      const isCurrentCreatedAt = prev.sortBy === "createdAt";
      const newDir = isCurrentCreatedAt && prev.sortDir === "DESC" ? "ASC" : "DESC";
      return {
        ...prev,
        sortBy: "createdAt",
        sortDir: newDir,
        page: 0,
      };
    });
  };

  /** Thực hiện quy trình quét phát hiện tệp mồ côi */
  const handleRescanOrphaned = async () => {
    try {
      setLoadingRescan(true);
      showBanner("Đang thực hiện quét tệp mồ côi...");
      const count = await fileAdminApi.rescanOrphaned();
      showBanner(`Quét xong! Phát hiện ${count} tệp mồ côi.`);
      fetchSummaryData();
      fetchFilesList();
    } catch (err: any) {
      showBanner(err?.response?.data?.message || "Không thể quét tệp mồ côi", true);
    } finally {
      setLoadingRescan(false);
    }
  };

  /** Xuất báo cáo danh sách tệp tin ra tệp CSV */
  const handleExportCsv = async () => {
    try {
      setLoadingExport(true);
      showBanner("Đang tải báo cáo CSV...");
      const blob = await fileAdminApi.exportCsv(filters);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `file_report_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      showBanner("Đã xuất báo cáo CSV thành công!");
    } catch (err) {
      showBanner("Xuất CSV thất bại", true);
    } finally {
      setLoadingExport(false);
    }
  };

  /** Tích chọn hoặc bỏ chọn tất cả tệp tin trong bảng */
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(files.map((f) => f.id));
    } else {
      setSelectedIds([]);
    }
  };

  /** Tích chọn từng tệp tin đơn lẻ */
  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((item) => item !== id));
    }
  };

  /** Thực hiện lưu trữ hàng loạt tệp tin đã chọn */
  const executeBulkArchive = async () => {
    if (selectedIds.length === 0) return;
    try {
      setBulkLoading(true);
      await fileAdminApi.bulkArchive({ fileIds: selectedIds });
      showBanner(`Đã chuyển trạng thái lưu trữ cho ${selectedIds.length} tệp tin.`);
      setSelectedIds([]);
      fetchSummaryData();
      fetchFilesList();
    } catch (err: any) {
      showBanner(err?.response?.data?.message || "Lỗi lưu trữ hàng loạt", true);
    } finally {
      setBulkLoading(false);
    }
  };

  /** Thực hiện xóa mềm hàng loạt tệp tin đã chọn */
  const executeBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    try {
      setBulkLoading(true);
      await fileAdminApi.bulkDelete({ fileIds: selectedIds });
      showBanner(`Đã xóa mềm thành công ${selectedIds.length} tệp tin.`);
      setSelectedIds([]);
      fetchSummaryData();
      fetchFilesList();
    } catch (err: any) {
      showBanner(err?.response?.data?.message || "Lỗi xóa mềm hàng loạt", true);
    } finally {
      setBulkLoading(false);
    }
  };

  /** Thực hiện xóa vĩnh viễn hàng loạt tệp tin đã chọn */
  const executeBulkPurge = async () => {
    if (selectedIds.length === 0) return;

    const nonDeleted = files.filter(
      (f) => selectedIds.includes(f.id) && f.status !== "DELETED"
    );

    if (nonDeleted.length > 0) {
      showBanner(
        `Chỉ có thể xóa vĩnh viễn các tệp tin đã ở trạng thái đã xóa mềm. Có ${nonDeleted.length} tệp tin chưa xóa mềm.`,
        true
      );
      return;
    }

    try {
      setBulkLoading(true);
      await fileAdminApi.bulkPurge({ fileIds: selectedIds });
      showBanner(`Đã xóa vĩnh viễn ${selectedIds.length} tệp tin khỏi hệ thống.`);
      setSelectedIds([]);
      fetchSummaryData();
      fetchFilesList();
    } catch (err: any) {
      showBanner(err?.response?.data?.message || "Lỗi xóa vĩnh viễn hàng loạt", true);
    } finally {
      setBulkLoading(false);
    }
  };

  /** Chuyển số liệu dung lượng theo module do Backend trả về thành dữ liệu biểu đồ. */
  const donutData = useMemo(() => {
    if (!summary?.sizeByUsageType) return [];
    return Object.entries(summary.sizeByUsageType)
      .map(([key, val]) => ({
        name: key,
        value: Number(val || 0),
        color: USAGE_COLORS[key] || "#6b7280",
      }))
      .filter((item) => item.value > 0);
  }, [summary]);

  /** Tính tổng dung lượng của các module thực sự có dữ liệu. */
  const totalDonutBytes = useMemo(() => {
    return donutData.reduce((acc, curr) => acc + curr.value, 0);
  }, [donutData]);

  /** Chuẩn hóa chuỗi xu hướng upload do Backend trả về sang MB để hiển thị chart. */
  const lineData = useMemo(() => {
    if (!summary?.uploadTrend) return [];
    return summary.uploadTrend.map((item) => ({
      month: item.month,
      count: item.count,
      sizeMB: parseFloat((Number(item.sizeBytes || 0) / (1024 * 1024)).toFixed(2)),
    }));
  }, [summary]);

  /** Kiểm tra Backend có phát sinh upload trong khoảng xu hướng hay không. */
  const hasUploadTrendData = lineData.some((item) => item.sizeMB > 0 || item.count > 0);

  /** Trả về Icon tương ứng với định dạng tệp tin theo token màu index.css */
  const renderFileIcon = (type: FileTypeEnum) => {
    switch (type) {
      case "IMAGE":
        return <FileImage className="h-4 w-4 text-brand-cobalt shrink-0" />;
      case "VIDEO":
        return <FileVideo className="h-4 w-4 text-primary shrink-0" />;
      case "AUDIO":
        return <FileAudio className="h-4 w-4 text-success-forest shrink-0" />;
      case "DOCUMENT":
        return <FileText className="h-4 w-4 text-brand-cobalt shrink-0" />;
      default:
        return <FileCode className="h-4 w-4 text-muted-foreground shrink-0" />;
    }
  };

  const totalPages = Math.ceil(totalElements / (filters.size || 10));

  return (
    <div className="p-6 space-y-6 w-full animate-in fade-in-50 duration-300">
      {/* Header Banner Notification */}
      {bannerMsg && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2 duration-200 ${
            bannerMsg.isError
              ? "bg-destructive/10 border-destructive/30 text-destructive"
              : "bg-success-forest/10 border-success-forest/30 text-success-forest"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {bannerMsg.isError ? <ShieldAlert className="h-5 w-5 shrink-0" /> : <CheckCircle2 className="h-5 w-5 shrink-0" />}
            <span className="text-xs font-semibold">{bannerMsg.text}</span>
          </div>
          <button onClick={() => setBannerMsg(null)} className="text-xs opacity-70 hover:opacity-100 font-bold cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-foreground">
            Quản lý tệp tin hệ thống
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Theo dõi tổng thể dung lượng, tự động quét phát hiện tệp mồ côi và quản lý dọn dẹp dữ liệu lưu trữ MinIO.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchSummaryData}
            disabled={loadingSummary}
            className="text-xs gap-1.5 rounded-xl border-border/80 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingSummary ? "animate-spin" : ""}`} /> Làm mới
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRescanOrphaned}
            disabled={loadingRescan}
            className="text-xs gap-1.5 rounded-xl border-brand-cobalt/40 text-brand-cobalt hover:bg-brand-cobalt/10 cursor-pointer"
          >
            {loadingRescan ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <AlertTriangle className="h-3.5 w-3.5" />
            )}
            Quét tệp mồ côi
          </Button>

          <Button
            size="sm"
            onClick={() => setUploadModalOpen(true)}
            className="text-xs gap-1.5 rounded-xl shadow-xs bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
          >
            <UploadCloud className="h-3.5 w-3.5" /> Tải tệp tin lên
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            disabled={loadingExport}
            className="text-xs gap-1.5 rounded-xl shadow-xs cursor-pointer"
          >
            {loadingExport ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <DownloadCloud className="h-3.5 w-3.5" />
            )}
            Xuất báo cáo CSV
          </Button>
        </div>
      </div>

      {/* Khu vực 1: Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <Card className="p-4 rounded-xl border border-border/60 bg-card shadow-2xs hover:border-border transition-all">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-[11px] font-medium">Tổng dung lượng</span>
            <HardDrive className="h-4 w-4 text-brand-cobalt" />
          </div>
          {loadingSummary ? (
            <div className="space-y-1.5 py-1">
              <Skeleton className="h-6 w-24 rounded-lg" />
              <Skeleton className="h-3 w-28 rounded-md" />
            </div>
          ) : (
            <>
              <div className="text-lg md:text-xl font-bold text-foreground">
                {summary ? formatBytes(summary.totalSizeBytes) : "Chưa có dữ liệu"}
              </div>
              <span className="text-[10px] text-muted-foreground/80 mt-1 block">
                {summaryError ? "Không thể tải dữ liệu" : "Toàn bộ tệp tin hoạt động"}
              </span>
            </>
          )}
        </Card>

        <Card className="p-4 rounded-xl border border-border/60 bg-card shadow-2xs hover:border-border transition-all">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-[11px] font-medium">Tổng số tệp tin</span>
            <Files className="h-4 w-4 text-primary" />
          </div>
          {loadingSummary ? (
            <div className="space-y-1.5 py-1">
              <Skeleton className="h-6 w-16 rounded-lg" />
              <Skeleton className="h-3 w-24 rounded-md" />
            </div>
          ) : (
            <>
              <div className="text-lg md:text-xl font-bold text-foreground">
                {summary ? summary.totalFiles.toLocaleString() : "Chưa có dữ liệu"}
              </div>
              <span className="text-[10px] text-muted-foreground/80 mt-1 block">Tệp tin trong hệ thống</span>
            </>
          )}
        </Card>

        <Card className="p-4 rounded-xl border border-chart-1/40 bg-chart-1/10 text-chart-1 shadow-xs hover:border-chart-1 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-chart-1">Tệp mồ côi</span>
            <AlertTriangle className="h-4 w-4 text-chart-1 animate-pulse" />
          </div>
          {loadingSummary ? (
            <div className="space-y-1.5 py-1">
              <Skeleton className="h-6 w-16 rounded-lg bg-chart-1/20" />
              <Skeleton className="h-3 w-28 rounded-md bg-chart-1/20" />
            </div>
          ) : (
            <>
              <div className="text-lg md:text-xl font-black text-chart-1">
                {summary ? summary.orphanedFilesCount.toLocaleString() : "Chưa có dữ liệu"}
              </div>
              <span className="text-[10px] text-chart-1/80 mt-1 block font-medium">
                Chưa liên kết tham chiếu
              </span>
            </>
          )}
        </Card>

        <Card className="p-4 rounded-xl border border-border/60 bg-card shadow-2xs hover:border-border transition-all">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-[11px] font-medium">Tải lên tháng này</span>
            <Calendar className="h-4 w-4 text-success-forest" />
          </div>
          {loadingSummary ? (
            <div className="space-y-1.5 py-1">
              <Skeleton className="h-6 w-16 rounded-lg" />
              <Skeleton className="h-3 w-24 rounded-md" />
            </div>
          ) : (
            <>
              <div className="text-lg md:text-xl font-bold text-foreground">
                {summary ? summary.uploadedThisMonth.toLocaleString() : "Chưa có dữ liệu"}
              </div>
              <span className="text-[10px] text-muted-foreground/80 mt-1 block">Tệp tin mới trong tháng</span>
            </>
          )}
        </Card>

        <Card className="p-4 rounded-xl border border-border/60 bg-card shadow-2xs hover:border-border transition-all">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-[11px] font-medium">Lưu trữ / Đã xóa</span>
            <Archive className="h-4 w-4 text-muted-foreground" />
          </div>
          {loadingSummary ? (
            <div className="space-y-1.5 py-1">
              <Skeleton className="h-6 w-16 rounded-lg" />
              <Skeleton className="h-3 w-28 rounded-md" />
            </div>
          ) : (
            <>
              <div className="text-lg md:text-xl font-bold text-foreground">
                {summary ? summary.archivedOrDeletedCount.toLocaleString() : "Chưa có dữ liệu"}
              </div>
              <span className="text-[10px] text-muted-foreground/80 mt-1 block">Đã lưu trữ / Đã xóa</span>
            </>
          )}
        </Card>
      </div>

      {/* Khu vực 2: Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Donut Chart Dung lượng theo Module */}
        <div className="p-5 rounded-2xl border border-border/60 bg-card space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <PieChartIcon className="h-4 w-4 text-primary" /> Tỷ lệ dung lượng theo mục đích
              </h3>
            </div>
            {loadingSummary ? (
              <Skeleton className="h-3.5 w-24 rounded-md" />
            ) : (
              <span className="text-[11px] text-muted-foreground font-mono font-semibold">
                Tổng: {formatBytes(totalDonutBytes)}
              </span>
            )}
          </div>

          <div className="h-56 w-full flex items-center justify-center">
            {loadingSummary ? (
              <div className="flex flex-col items-center justify-center gap-3">
                <Skeleton className="h-40 w-40 rounded-full" />
                <Skeleton className="h-3 w-32 rounded-md" />
              </div>
            ) : donutData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {donutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [formatBytes(val), "Dung lượng"]}
                    contentStyle={{ borderRadius: "8px", fontSize: "12px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <span className="text-xs text-muted-foreground italic">Chưa có dữ liệu</span>
            )}
          </div>

          {/* Custom Legend dưới chart */}
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 pt-2 border-t border-border/40 text-[11px]">
            {loadingSummary ? (
              <div className="flex gap-4">
                <Skeleton className="h-3.5 w-20 rounded-md" />
                <Skeleton className="h-3.5 w-20 rounded-md" />
              </div>
            ) : (
              donutData.map((item) => {
                const pct = totalDonutBytes > 0 ? ((item.value / totalDonutBytes) * 100).toFixed(1) : "0";
                return (
                  <div key={item.name} className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="font-medium text-foreground">{item.name}</span>
                    <span className="text-muted-foreground font-mono">({pct}%)</span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Line Chart */}
        <div className="p-5 rounded-2xl border border-border/60 bg-card space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-success-forest" /> Xu hướng dung lượng tải lên
            </h3>
            <span className="text-[11px] text-muted-foreground font-semibold">Tính theo MB</span>
          </div>

          <div className="h-56 w-full">
            {loadingSummary ? (
              <Skeleton className="h-full w-full rounded-xl" />
            ) : hasUploadTrendData ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={lineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSize" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#293681" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#293681" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(150,150,150,0.15)" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(val: any) => [`${val} MB`, "Dung lượng"]}
                    contentStyle={{ borderRadius: "8px", fontSize: "12px" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="sizeMB"
                    stroke="#293681"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorSize)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground italic">
                Chưa có dữ liệu xu hướng
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-border/40 text-[11px] text-muted-foreground text-center">
            Thống kê xu hướng dung lượng tải lên hàng tháng hỗ trợ dự báo nhu cầu lưu trữ.
          </div>
        </div>
      </div>

      {/* Khu vực 3: Bảng dữ liệu chính */}
      <Card className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-xs">
        {/* Quick Status Tabs: Tệp Hoạt động | Lưu trữ | Thùng rác | Tất cả */}
        <div className="px-4 pt-3 pb-0 border-b border-border/40 bg-muted/20 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1 overflow-x-auto">
            <button
              type="button"
              onClick={() => setFilters((prev) => ({ ...prev, status: "ACTIVE", page: 0 }))}
              className={`px-3.5 py-2 text-xs font-bold rounded-t-xl border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                filters.status === "ACTIVE"
                  ? "border-success-forest text-success-forest bg-card shadow-xs"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40"
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-success-forest" />
              Tệp hoạt động
              {summary?.activeFiles !== undefined && (
                <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 h-4 bg-success-forest/10 text-success-forest border border-success-forest/20">
                  {summary.activeFiles}
                </Badge>
              )}
            </button>

            <button
              type="button"
              onClick={() => setFilters((prev) => ({ ...prev, status: "ARCHIVED", page: 0 }))}
              className={`px-3.5 py-2 text-xs font-bold rounded-t-xl border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                filters.status === "ARCHIVED"
                  ? "border-brand-cobalt text-brand-cobalt bg-card shadow-xs"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40"
              }`}
            >
              <Archive className="h-3.5 w-3.5 text-brand-cobalt" />
              Đã lưu trữ
            </button>

            <button
              type="button"
              onClick={() => setFilters((prev) => ({ ...prev, status: "DELETED", page: 0 }))}
              className={`px-3.5 py-2 text-xs font-bold rounded-t-xl border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                filters.status === "DELETED"
                  ? "border-destructive text-destructive bg-card shadow-xs"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40"
              }`}
            >
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
              Thùng rác
              {summary?.deletedFiles !== undefined && (
                <Badge variant="destructive" className="ml-1 text-[10px] px-1.5 py-0 h-4 bg-destructive/10 text-destructive border border-destructive/20 font-bold">
                  {summary.deletedFiles}
                </Badge>
              )}
            </button>

            <button
              type="button"
              onClick={() => setFilters((prev) => ({ ...prev, status: "ALL", page: 0 }))}
              className={`px-3.5 py-2 text-xs font-bold rounded-t-xl border-b-2 transition-all cursor-pointer ${
                filters.status === "ALL"
                  ? "border-primary text-primary bg-card shadow-xs"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40"
              }`}
            >
              Tất cả tệp tin
            </button>
          </div>
        </div>

        {/* Thanh Filter */}
        <div className="p-4 border-b border-border/60 space-y-3 bg-muted/10">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative min-w-[200px] flex-1">
              <Search className="h-4 w-4 absolute left-3 top-2.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Tìm theo tên tệp tin gốc..."
                value={filters.keyword || ""}
                onChange={(e) => setFilters((prev) => ({ ...prev, keyword: e.target.value, page: 0 }))}
                className="pl-9 h-9 text-xs rounded-xl border-border/80 bg-background text-foreground"
              />
            </div>

            {/* Module Filter */}
            <Select
              value={filters.usageType as string}
              onValueChange={(val) => setFilters((prev) => ({ ...prev, usageType: val as any, page: 0 }))}
            >
              <SelectTrigger className="h-9 w-[140px] text-xs rounded-xl border-border/80 bg-background text-foreground">
                <SelectValue placeholder="Mục đích" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả mục đích</SelectItem>
                <SelectItem value="CONTRACT">Hợp đồng</SelectItem>
                <SelectItem value="AVATAR">Ảnh đại diện</SelectItem>
                <SelectItem value="QUIZ_ATTACHMENT">Bài trắc nghiệm</SelectItem>
                <SelectItem value="ASSIGNMENT">Bài tập</SelectItem>
                <SelectItem value="ASSIGNMENT_SUBMISSION">Bài nộp bài tập</SelectItem>
                <SelectItem value="LESSON_RESOURCE">Tài liệu bài học</SelectItem>
                <SelectItem value="LESSON_VIDEO">Video bài học</SelectItem>
                <SelectItem value="COURSE_LESSON">Bài học khóa học</SelectItem>
                <SelectItem value="POLICY">Chính sách</SelectItem>
                <SelectItem value="OTHER">Khác</SelectItem>
              </SelectContent>
            </Select>

            {/* File Type Filter */}
            <Select
              value={filters.fileType as string}
              onValueChange={(val) => setFilters((prev) => ({ ...prev, fileType: val as any, page: 0 }))}
            >
              <SelectTrigger className="h-9 w-[130px] text-xs rounded-xl border-border/80 bg-background text-foreground">
                <SelectValue placeholder="Loại tệp tin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả loại tệp</SelectItem>
                <SelectItem value="DOCUMENT">Tài liệu PDF</SelectItem>
                <SelectItem value="IMAGE">Hình ảnh</SelectItem>
                <SelectItem value="VIDEO">Video</SelectItem>
                <SelectItem value="AUDIO">Âm thanh</SelectItem>
                <SelectItem value="OTHER">Khác</SelectItem>
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select
              value={filters.status as string}
              onValueChange={(val) => setFilters((prev) => ({ ...prev, status: val as any, page: 0 }))}
            >
              <SelectTrigger className="h-9 w-[140px] text-xs rounded-xl border-border/80 bg-background text-foreground">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
                <SelectItem value="ACTIVE">Hoạt động</SelectItem>
                <SelectItem value="ARCHIVED">Lưu trữ</SelectItem>
                <SelectItem value="DELETED">Đã xóa</SelectItem>
              </SelectContent>
            </Select>

            {/* Orphaned Filter */}
            <Select
              value={filters.isOrphaned === undefined ? "ALL" : String(filters.isOrphaned)}
              onValueChange={(val) =>
                setFilters((prev) => ({
                  ...prev,
                  isOrphaned: val === "ALL" ? "ALL" : val === "true",
                  page: 0,
                }))
              }
            >
              <SelectTrigger className="h-9 w-[140px] text-xs rounded-xl border-border/80 bg-background text-foreground">
                <SelectValue placeholder="Tham chiếu" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả tham chiếu</SelectItem>
                <SelectItem value="false">Đang sử dụng</SelectItem>
                <SelectItem value="true">Chưa liên kết</SelectItem>
              </SelectContent>
            </Select>

            {/* Date Range Filter */}
            <div className="w-[140px]">
              <DatePickerInput
                value={filters.startDate || ""}
                onChange={(val) => setFilters((prev) => ({ ...prev, startDate: val, page: 0 }))}
                placeholder="Từ ngày"
              />
            </div>

            <div className="w-[140px]">
              <DatePickerInput
                value={filters.endDate || ""}
                onChange={(val) => setFilters((prev) => ({ ...prev, endDate: val, page: 0 }))}
                placeholder="Đến ngày"
              />
            </div>

            {/* Sort Select */}
            <Select
              value={`${filters.sortBy}:${filters.sortDir}`}
              onValueChange={(val) => {
                const [sb, sd] = val.split(":");
                setFilters((prev) => ({ ...prev, sortBy: sb, sortDir: sd as any, page: 0 }));
              }}
            >
              <SelectTrigger className="h-9 w-[150px] text-xs rounded-xl border-border/80 bg-background text-foreground">
                <SelectValue placeholder="Sắp xếp" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt:DESC">Mới nhất</SelectItem>
                <SelectItem value="createdAt:ASC">Cũ nhất</SelectItem>
                <SelectItem value="fileSize:DESC">Dung lượng giảm dần</SelectItem>
                <SelectItem value="fileSize:ASC">Dung lượng tăng dần</SelectItem>
                <SelectItem value="originalName:ASC">Tên tệp (A-Z)</SelectItem>
              </SelectContent>
            </Select>

            {/* Nút Reset Filter */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetFilters}
              className="h-9 text-xs gap-1.5 rounded-xl border-border/80 cursor-pointer"
              title="Đặt lại tất cả bộ lọc"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Đặt lại
            </Button>
          </div>
        </div>

        {/* Thanh Floating Bulk Action */}
        {selectedIds.length > 0 && (
          <div className="px-4 py-3 bg-primary/10 border-b border-primary/20 flex items-center justify-between animate-in fade-in duration-200 text-xs">
            <div className="flex items-center gap-3">
              <span className="font-bold text-primary flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" />
                Đã chọn <span className="underline">{selectedIds.length}</span> tệp tin
              </span>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedIds([])}
                className="h-7 text-[11px] gap-1 text-primary hover:bg-primary/20 rounded-lg font-bold cursor-pointer"
                title="Bỏ chọn tất cả"
              >
                <X className="h-3.5 w-3.5" /> Bỏ chọn tất cả
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmBulkArchiveOpen(true)}
                disabled={bulkLoading}
                className="text-xs gap-1 h-8 rounded-lg border-brand-cobalt/30 text-brand-cobalt hover:bg-brand-cobalt/10 cursor-pointer"
              >
                {bulkLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Archive className="h-3.5 w-3.5" />}
                Lưu trữ đã chọn
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmBulkDeleteOpen(true)}
                disabled={bulkLoading}
                className="text-xs gap-1 h-8 rounded-lg border-destructive/30 text-destructive hover:bg-destructive/10 cursor-pointer"
              >
                {bulkLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                Xóa mềm tệp tin
              </Button>

              <Button
                variant="destructive"
                size="sm"
                onClick={() => setConfirmBulkPurgeOpen(true)}
                disabled={bulkLoading}
                className="text-xs gap-1 h-8 rounded-lg cursor-pointer"
              >
                {bulkLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                Xóa vĩnh viễn
              </Button>
            </div>
          </div>
        )}

        {/* Bảng danh sách */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-10 text-center">
                  <Checkbox
                    checked={files.length > 0 && selectedIds.length === files.length}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground">Tên tệp tin gốc</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground">Mục đích</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground">Loại tệp tin</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground">Kích thước</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground">Người tải</TableHead>
                <TableHead
                  onClick={toggleSortCreatedDate}
                  className="text-xs font-semibold text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Ngày tải</span>
                    {filters.sortBy === "createdAt" ? (
                      filters.sortDir === "DESC" ? (
                        <ArrowDown className="h-3.5 w-3.5 text-primary font-bold" />
                      ) : (
                        <ArrowUp className="h-3.5 w-3.5 text-primary font-bold" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/60" />
                    )}
                  </div>
                </TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground">Tham chiếu</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground">Trạng thái</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loadingFiles ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <TableRow key={`skeleton-row-${idx}`}>
                    <TableCell className="text-center">
                      <Skeleton className="h-4 w-4 mx-auto rounded" />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-4 w-4 rounded shrink-0" />
                        <Skeleton className="h-4 w-36 rounded" />
                      </div>
                    </TableCell>
                    <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-14 rounded" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16 rounded" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20 rounded" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24 rounded" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                  </TableRow>
                ))
              ) : files.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-32 text-center text-xs text-muted-foreground italic">
                    Không tìm thấy tệp tin phù hợp với bộ lọc hiện tại.
                  </TableCell>
                </TableRow>
              ) : (
                files.map((file) => {
                  const isSelected = selectedIds.includes(file.id);
                  const isOrphan = file.orphaned || !file.referenceEntityId;

                  return (
                    <TableRow
                      key={file.id}
                      onClick={() => {
                        setSelectedFileForModal(file);
                        setModalOpen(true);
                      }}
                      className={`cursor-pointer transition-colors text-xs ${
                        isSelected ? "bg-primary/5" : "hover:bg-muted/40"
                      }`}
                    >
                      <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => handleSelectOne(file.id, !!checked)}
                        />
                      </TableCell>

                      <TableCell className="font-semibold text-foreground max-w-[220px] truncate">
                        <div className="flex items-center gap-2 truncate" title={file.originalName}>
                          {renderFileIcon(file.fileType)}
                          <span className="truncate">{file.originalName}</span>
                        </div>
                      </TableCell>

                      <TableCell>{getUsageTypeBadge(file.usageType)}</TableCell>

                      <TableCell className="font-mono text-[11px] text-muted-foreground">
                        {file.fileType}
                      </TableCell>

                      <TableCell className="font-mono">{formatBytes(file.fileSize)}</TableCell>

                      <TableCell className="text-muted-foreground truncate">
                        {file.createdByName ? (
                          <div>
                            <div className="font-semibold text-foreground truncate">{file.createdByName}</div>
                            {file.createdByCode && (
                              <span className="font-mono text-[10px] text-muted-foreground block font-semibold">{file.createdByCode}</span>
                            )}
                          </div>
                        ) : file.createdBy ? (
                          `ID: ${file.createdBy}`
                        ) : (
                          "N/A"
                        )}
                      </TableCell>

                      <TableCell className="text-muted-foreground whitespace-nowrap font-mono">
                        {formatDateTime(file.createdAt)}
                      </TableCell>

                      <TableCell>
                        {isOrphan ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-destructive/10 text-destructive border border-destructive/20">
                            Chưa liên kết
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-success-forest/10 text-success-forest border border-success-forest/20">
                            Đang sử dụng
                          </span>
                        )}
                      </TableCell>

                      <TableCell>{getStatusBadge(file.status)}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Table Footer & Pagination Form */}
        <div className="px-5 py-3 border-t border-border/40 bg-card flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-medium">
          <div className="text-muted-foreground">
            Hiển thị <span className="font-semibold text-foreground">{files.length === 0 ? 0 : (filters.page || 0) * (filters.size || 10) + 1}</span> đến{" "}
            <span className="font-semibold text-foreground">{Math.min(((filters.page || 0) + 1) * (filters.size || 10), totalElements)}</span> trên{" "}
            <span className="font-semibold text-foreground">{totalElements}</span> bản ghi
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Số dòng/trang:</span>
              <Select
                value={String(filters.size || 10)}
                onValueChange={(val) => setFilters((prev) => ({ ...prev, size: Number(val), page: 0 }))}
              >
                <SelectTrigger className="h-8 w-16 text-xs bg-background border border-border rounded-lg font-bold">
                  <SelectValue placeholder={String(filters.size || 10)} />
                </SelectTrigger>
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
                if (!isNaN(pNum) && pNum >= 1 && pNum <= totalPages) {
                  setFilters((prev) => ({ ...prev, page: pNum - 1 }));
                }
              }}
              className="flex items-center gap-1.5"
            >
              <span className="text-muted-foreground">Tới trang:</span>
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
                disabled={(filters.page || 0) === 0}
                onClick={() => setFilters((prev) => ({ ...prev, page: Math.max(0, (prev.page || 0) - 1) }))}
                variant="outline"
                size="sm"
                className="h-8 text-xs font-semibold rounded-lg cursor-pointer"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Trước
              </Button>
              {getPageNumbers(filters.page || 0, totalPages).map((p, idx) => {
                if (p === "...") return <span key={`dots-${idx}`} className="px-1 text-muted-foreground">...</span>;
                const pageNum = p as number;
                const isCurrent = pageNum === (filters.page || 0);
                return (
                  <Button
                    key={pageNum}
                    onClick={() => setFilters((prev) => ({ ...prev, page: pageNum }))}
                    variant={isCurrent ? "default" : "outline"}
                    size="sm"
                    className={`h-8 min-w-8 text-xs font-bold rounded-lg cursor-pointer ${
                      isCurrent ? "shadow-xs" : ""
                    }`}
                  >
                    {pageNum + 1}
                  </Button>
                );
              })}
              <Button
                disabled={(filters.page || 0) + 1 >= totalPages}
                onClick={() => setFilters((prev) => ({ ...prev, page: (prev.page || 0) + 1 }))}
                variant="outline"
                size="sm"
                className="h-8 text-xs font-semibold rounded-lg cursor-pointer"
              >
                Sau <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* ConfirmDialog của Shadcn UI cho các thao tác hàng loạt */}
      <ConfirmDialog
        open={confirmBulkArchiveOpen}
        onOpenChange={setConfirmBulkArchiveOpen}
        title="Xác nhận lưu trữ hàng loạt"
        description={`Bạn có chắc chắn muốn chuyển trạng thái lưu trữ cho ${selectedIds.length} tệp tin đã chọn?`}
        variant="warning"
        confirmText="Lưu trữ"
        onConfirm={executeBulkArchive}
      />

      <ConfirmDialog
        open={confirmBulkDeleteOpen}
        onOpenChange={setConfirmBulkDeleteOpen}
        title="Xác nhận xóa mềm hàng loạt"
        description={`Xác nhận xóa mềm ${selectedIds.length} tệp tin đã chọn? Các tệp tin sẽ được chuyển sang trạng thái đã xóa.`}
        variant="destructive"
        confirmText="Xóa mềm"
        onConfirm={executeBulkDelete}
      />

      <ConfirmDialog
        open={confirmBulkPurgeOpen}
        onOpenChange={setConfirmBulkPurgeOpen}
        title="Cảnh báo xóa vĩnh viễn hàng loạt"
        description={`Hành động này sẽ xóa vĩnh viễn ${selectedIds.length} tệp tin khỏi hệ thống lưu trữ và cơ sở dữ liệu. Dữ liệu không thể phục hồi!`}
        variant="destructive"
        confirmText="Xóa vĩnh viễn"
        onConfirm={executeBulkPurge}
      />

      {/* Modal Giữa Màn Hình Xem Chi Tiết File & Audit Log */}
      <FileDetailModal
        file={selectedFileForModal}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onFileUpdated={(updated) => setSelectedFileForModal(updated)}
        onRefresh={() => {
          fetchSummaryData();
          fetchFilesList();
        }}
        onActionSuccess={(msg) => showBanner(msg)}
      />

      {/* Modal Tải Tệp Tin Mới Lên MinIO */}
      <FileUploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onSuccess={(msg) => {
          showBanner(msg);
          fetchSummaryData();
          fetchFilesList();
        }}
      />
    </div>
  );
};
