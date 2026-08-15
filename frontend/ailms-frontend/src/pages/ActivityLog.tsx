import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { UserRole } from "@/config/roles";
import { auditLogApi, type AuditLogResponse } from "@/api/audit/auditLogApi";
import { studentApi, type StudentActivityHistoryItem } from "@/api/student/studentApi";
import { DatePickerInput } from "@/components/ui/DatePickerInput";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { DetailAuditLogModal } from "@/components/admin/audit/DetailAuditLogModal";
import { Badge } from "@/components/ui/badge";
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
import {
  Activity,
  ArrowLeft,
  Info,
  Loader2,
  AlertCircle,
  Clock,
  Search,
  RotateCcw,
  Eye,
  ChevronLeft,
  ChevronRight,
  Download,
  CheckCircle2,
  X,
  Trash2,
  BookOpen,
  Monitor,
  Laptop,
  Smartphone,
  Shield,
  FileJson,
  Sparkles,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";

/** Hàm tính toán danh sách trang hiển thị trong thanh phân trang */
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

export const ActivityLog: React.FC = () => {
  const { auth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isAdmin = auth.user?.roles.includes(UserRole.ADMIN);
  const isStudent = Boolean(auth.user?.roles.includes(UserRole.STUDENT) && !isAdmin);
  const isStaffActivity = Boolean(!isAdmin && !isStudent);
  const currentUserId = auth.user ? auth.user.id : null;

  // Auto-redirect Admin to /admin/activity-log to ensure Sidebar renders
  useEffect(() => {
    if (isAdmin && location.pathname === "/activity-log") {
      navigate("/admin/activity-log", { replace: true });
    }
  }, [isAdmin, location.pathname, navigate]);

  // Banners
  const [errorBanner, setErrorBanner] = useState("");
  const [successBanner, setSuccessBanner] = useState("");

  // Loading state
  const [loading, setLoading] = useState(false);

  // Live Auto-refresh state (Admin mode)
  const [isLive, setIsLive] = useState(false);

  // Admin Audit Log Data states
  const [adminLogs, setAdminLogs] = useState<AuditLogResponse[]>([]);
  const [selectedLogIds, setSelectedLogIds] = useState<string[]>([]);

  // Student Activity Log States
  const [studentTab, setStudentTab] = useState<"LEARNING" | "SYSTEM">("LEARNING"); // Default: Learning History
  const [studentLogs, setStudentLogs] = useState<StudentActivityHistoryItem[]>([]);
  const [selectedStudentLog, setSelectedStudentLog] = useState<StudentActivityHistoryItem | null>(null);
  const [studentDetailModalOpen, setStudentDetailModalOpen] = useState(false);
  const [studentLogToDelete, setStudentLogToDelete] = useState<{ id: string; type: "LEARNING" | "SYSTEM" } | null>(null);

  // Pagination & Search States
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [jumpPageInput, setJumpPageInput] = useState("1");

  // Admin filter states
  const [searchKeyword, setSearchKeyword] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState("");
  const [filterEntityType, setFilterEntityType] = useState("ALL");
  const [selectedActions, setSelectedActions] = useState<string[]>([]);
  const [filterUserQuery, setFilterUserQuery] = useState("");
  const [debouncedUserQuery, setDebouncedUserQuery] = useState("");
  const [filterIpAddress, setFilterIpAddress] = useState("");
  const [filterStart, setFilterStart] = useState("");
  const [filterEnd, setFilterEnd] = useState("");

  // Sorting state for Admin
  const [sortRule, setSortRule] = useState<{ field: string; dir: "ASC" | "DESC" }>({
    field: "occurredAt",
    dir: "DESC"
  });

  // Admin Modal Detail & Delete states
  const [adminDetailModalOpen, setAdminDetailModalOpen] = useState(false);
  const [selectedAdminLog, setSelectedAdminLog] = useState<AuditLogResponse | null>(null);
  const [adminLogToDelete, setAdminLogToDelete] = useState<AuditLogResponse | null>(null);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Debounce search inputs
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(searchKeyword);
      setPage(0);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchKeyword]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedUserQuery(filterUserQuery);
      setPage(0);
    }, 500);
    return () => clearTimeout(timer);
  }, [filterUserQuery]);

  // Synchronize jump page input state
  useEffect(() => {
    setJumpPageInput(String(page + 1));
  }, [page]);

  // Main fetch hook
  useEffect(() => {
    if (isAdmin) {
      fetchAdminLogs();
    } else if (isStaffActivity) {
      fetchStaffLogs();
    } else {
      fetchStudentLogs();
    }
  }, [isAdmin, isStaffActivity, studentTab, page, pageSize, sortRule, debouncedKeyword, debouncedUserQuery]);

  // Auto-refresh interval for Admin Live monitoring
  useEffect(() => {
    if (!isLive || !isAdmin) return;
    const interval = setInterval(() => {
      fetchAdminLogs(true);
    }, 15000);
    return () => clearInterval(interval);
  }, [isLive, isAdmin, page, pageSize, debouncedKeyword, filterEntityType, selectedActions, debouncedUserQuery, filterIpAddress, filterStart, filterEnd, sortRule]);

  /** Hiển thị thông báo banner toast thành công hoặc lỗi */
  const showBanner = (msg: string, isError = false) => {
    if (isError) {
      setErrorBanner(msg);
      setTimeout(() => setErrorBanner(""), 3500);
    } else {
      setSuccessBanner(msg);
      setTimeout(() => setSuccessBanner(""), 3500);
    }
  };

  /** Lấy danh sách nhật ký kiểm toán dành cho Quản trị viên */
  const fetchAdminLogs = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const params: any = {
        page,
        size: pageSize,
        sort: `${sortRule.field}:${sortRule.dir.toLowerCase()}`
      };
      if (debouncedKeyword.trim()) params.keyword = debouncedKeyword.trim();
      if (filterEntityType !== "ALL") params.entityType = filterEntityType;
      if (selectedActions.length > 0) params.actions = selectedActions;
      if (debouncedUserQuery.trim()) params.userQuery = debouncedUserQuery.trim();
      if (filterIpAddress.trim()) params.ipAddress = filterIpAddress.trim();
      if (filterStart) params.occurredFrom = new Date(filterStart).toISOString();
      if (filterEnd) params.occurredTo = new Date(filterEnd).toISOString();

      const res = await auditLogApi.getAuditLogs(params);
      if (res.data.success) {
        const pageData = res.data.data;
        setAdminLogs(pageData.content || []);
        setTotalPages(pageData.totalPages || 0);
        setTotalElements(pageData.totalElements || 0);
        setSelectedLogIds([]);
      }
    } catch (err: any) {
      showBanner(err.message || "Không thể tải nhật ký hoạt động hệ thống", true);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  /** Lấy danh sách nhật ký hoạt động và học tập của Học viên */
  const fetchStudentLogs = async () => {
    setLoading(true);
    try {
      let res;
      if (studentTab === "LEARNING") {
        res = await studentApi.getLearningHistory(page, pageSize);
      } else {
        res = await studentApi.getSystemHistory(page, pageSize);
      }
      if (res) {
        setStudentLogs(res.content || []);
        setTotalPages(res.totalPages || 0);
        setTotalElements(res.totalElements || 0);
      }
    } catch (err: any) {
      showBanner(err.message || "Không thể tải lịch sử hoạt động cá nhân", true);
    } finally {
      setLoading(false);
    }
  };

  /** Lấy audit log cá nhân cho Teacher/TA, không gọi nhầm API chỉ dành cho Student. */
  const fetchStaffLogs = async () => {
    if (!currentUserId) return;
    setLoading(true);
    try {
      const response = await auditLogApi.getAuditLogsByUserId(currentUserId, {
        page, size: pageSize, sort: "occurredAt:desc",
      });
      const pageData = response.data.data;
      setStudentLogs((pageData.content || []).map((item: AuditLogResponse): StudentActivityHistoryItem => ({
        id: item.id, historyType: "SYSTEM", action: item.action, entityType: item.entityType,
        entityId: item.entityId, metadata: item.newValue, ipAddress: item.ipAddress,
        userAgent: item.userAgent, occurredAt: item.occurredAt,
      })));
      setTotalPages(pageData.totalPages || 0);
      setTotalElements(pageData.totalElements || 0);
    } catch (err: any) {
      showBanner(err.response?.data?.message || err.message || "Không thể tải lịch sử hoạt động cá nhân", true);
    } finally {
      setLoading(false);
    }
  };

  /** Chuyển đổi giữa tab lịch sử học tập và lịch sử hệ thống của Học viên */
  const handleStudentTabSwitch = (tab: "LEARNING" | "SYSTEM") => {
    setStudentTab(tab);
    setPage(0);
  };

  /** Mở modal chi tiết nhật ký hoạt động cá nhân của Học viên */
  const handleOpenStudentDetail = async (item: StudentActivityHistoryItem) => {
    if (isStaffActivity) {
      setSelectedStudentLog(item);
      setStudentDetailModalOpen(true);
      return;
    }
    try {
      let detail: StudentActivityHistoryItem;
      if (studentTab === "LEARNING") {
        detail = await studentApi.getLearningHistoryDetail(item.id);
      } else {
        detail = await studentApi.getSystemHistoryDetail(item.id);
      }
      setSelectedStudentLog(detail || item);
      setStudentDetailModalOpen(true);
    } catch {
      setSelectedStudentLog(item);
      setStudentDetailModalOpen(true);
    }
  };

  /** Xóa bản ghi nhật ký hoạt động của Học viên */
  const handleDeleteStudentLog = async (id: string, type: "LEARNING" | "SYSTEM") => {
    try {
      if (type === "LEARNING") {
        await studentApi.deleteLearningHistory(id);
      } else {
        await studentApi.deleteSystemHistory(id);
      }
      showBanner("Xóa bản ghi nhật ký hoạt động thành công!");
      fetchStudentLogs();
    } catch (err: any) {
      showBanner(err.message || "Không thể xóa bản ghi nhật ký này.", true);
    }
  };

  /** Xóa 1 bản ghi nhật ký kiểm toán phía Admin */
  const handleDeleteAdminLog = async (logId: string) => {
    try {
      const res = await auditLogApi.deleteAuditLog(logId);
      if (res.data.success) {
        showBanner("Xóa bản ghi nhật ký kiểm toán thành công!");
        fetchAdminLogs();
      } else {
        showBanner(res.data.message || "Lỗi xóa bản ghi nhật ký", true);
      }
    } catch (err: any) {
      showBanner(err.message || "Lỗi xóa bản ghi nhật ký", true);
    }
  };

  /** Xóa hàng loạt bản ghi nhật ký kiểm toán được chọn phía Admin */
  const handleBulkDeleteAdminLogs = async () => {
    if (selectedLogIds.length === 0) return;
    try {
      const res = await auditLogApi.bulkDeleteAuditLogs(selectedLogIds);
      if (res.data.success) {
        showBanner(`Xóa thành công ${selectedLogIds.length} bản ghi nhật ký kiểm toán!`);
        setSelectedLogIds([]);
        fetchAdminLogs();
      } else {
        showBanner(res.data.message || "Lỗi xóa hàng loạt nhật ký", true);
      }
    } catch (err: any) {
      showBanner(err.message || "Lỗi xóa hàng loạt nhật ký", true);
    }
  };

  /** Xử lý lọc dữ liệu nhật ký */
  const handleApplyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    setDebouncedKeyword(searchKeyword);
    setDebouncedUserQuery(filterUserQuery);
    if (isAdmin) {
      fetchAdminLogs();
    }
  };

  /** Xuất báo cáo nhật ký kiểm toán ra file CSV */
  const handleExportCSV = async () => {
    setLoading(true);
    try {
      const params: any = {
        sort: `${sortRule.field}:${sortRule.dir.toLowerCase()}`
      };
      if (debouncedKeyword.trim()) params.keyword = debouncedKeyword.trim();
      if (filterEntityType !== "ALL") params.entityType = filterEntityType;
      if (selectedActions.length > 0) params.actions = selectedActions;

      const response = await auditLogApi.exportAuditLogs(params);
      const blob = new Blob([response.data], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `audit_logs_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      showBanner("Xuất báo cáo kiểm toán CSV thành công!");
    } catch (err: any) {
      showBanner(err.message || "Không thể xuất file báo cáo CSV", true);
    } finally {
      setLoading(false);
    }
  };

  /** Trả về class màu badge cho từng loại hành động theo token màu index.css */
  const getActionColor = (action: string) => {
    const act = (action || "").toLowerCase();
    if (act.includes("complete") || act.includes("create") || act.includes("add") || act.includes("insert")) {
      return "bg-success-forest/10 text-success-forest border-success-forest/20";
    }
    if (act.includes("view") || act.includes("update") || act.includes("edit") || act.includes("transfer")) {
      return "bg-brand-cobalt/10 text-brand-cobalt border-brand-cobalt/20";
    }
    if (act.includes("delete") || act.includes("remove") || act.includes("destroy") || act.includes("clear")) {
      return "bg-destructive/10 text-destructive border-destructive/20";
    }
    if (act.includes("submit") || act.includes("quiz") || act.includes("assignment")) {
      return "bg-primary/10 text-primary border-primary/20";
    }
    if (act.includes("login") || act.includes("auth")) {
      return "bg-chart-1/10 text-chart-1 border-chart-1/20";
    }
    return "bg-muted text-muted-foreground border-border";
  };

  /** Định dạng hiển thị thời gian chuẩn Tiếng Việt */
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    try {
      const d = new Date(dateStr);
      return d.toLocaleString("vi-VN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      });
    } catch {
      return dateStr;
    }
  };

  /** Chuyển đổi chuỗi Metadata JSON sang định dạng hiển thị */
  const parseMetadataJson = (metaStr?: string | null) => {
    if (!metaStr) return null;
    try {
      return JSON.parse(metaStr);
    } catch {
      return metaStr;
    }
  };

  return (
    <div className="mx-auto max-w-none w-full space-y-8 animate-in fade-in-50 duration-300">
      
      {/* Toast Alert Banner */}
      {errorBanner && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl bg-destructive text-white px-4 py-3 shadow-xl animate-in slide-in-from-bottom-5 duration-300">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span className="text-sm font-semibold">{errorBanner}</span>
          <button onClick={() => setErrorBanner("")} className="ml-2 hover:opacity-80 cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {successBanner && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl bg-success-forest text-white px-4 py-3 shadow-xl animate-in slide-in-from-bottom-5 duration-300">
          <Info className="h-5 w-5 shrink-0" />
          <span className="text-sm font-semibold">{successBanner}</span>
          <button onClick={() => setSuccessBanner("")} className="ml-2 hover:opacity-80 cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            <span>{isAdmin ? "Nhật ký hoạt động hệ thống" : "Lịch sử hoạt động cá nhân"}</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isAdmin
              ? "Giám sát tất cả thay đổi dữ liệu, hành vi người dùng và bảo mật hệ thống."
              : "Theo dõi toàn bộ tiến độ học tập, bài giảng xem gần đây và lịch sử thao tác hệ thống của bạn."}
          </p>
        </div>
      </div>

      {/* Main Content Area */}
      {isAdmin ? (
        /* ===================================================
           ADMIN CONSOLE LAYOUT
           =================================================== */
        <div className="space-y-6">
          <Card className="border-border shadow-sm bg-card overflow-hidden">
            <CardHeader className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-border/30 bg-card">
              <div>
                <CardTitle className="text-xl font-semibold tracking-tight font-heading flex items-center gap-2">
                  <span>Danh sách Nhật ký kiểm toán Quản trị viên</span>
                </CardTitle>
                <CardDescription className="text-sm text-muted-foreground mt-0.5">
                  Tra cứu chi tiết các thao tác chỉnh sửa dữ liệu, đăng nhập, xoá dữ liệu trên hệ thống.
                </CardDescription>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 bg-muted/40 p-1.5 px-3 rounded-lg border border-border/50">
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isLive ? "bg-success-forest" : "bg-muted-foreground"}`}></span>
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${isLive ? "bg-success-forest" : "bg-muted-foreground"}`}></span>
                  </span>
                  <span className="text-xs font-bold select-none cursor-pointer" onClick={() => setIsLive(!isLive)}>
                    {isLive ? "Giám sát trực tiếp (LIVE)" : "Chế độ LIVE tắt"}
                  </span>
                  <Checkbox
                    checked={isLive}
                    onCheckedChange={(checked) => setIsLive(!!checked)}
                    className="h-4 w-4 rounded-md border-border/40"
                  />
                </div>

                <Button onClick={handleExportCSV} variant="outline" size="sm" className="h-9 gap-1.5 font-semibold cursor-pointer border border-border/30 bg-background text-foreground hover:bg-muted">
                  <Download className="h-4 w-4" /> <span>Xuất CSV</span>
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-card">
                  <TableRow className="bg-card border-border/40">
                    <TableHead className="py-3 px-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Thời gian</TableHead>
                    <TableHead className="py-3 px-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Tài khoản</TableHead>
                    <TableHead className="py-3 px-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Hành động</TableHead>
                    <TableHead className="py-3 px-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Thành phần</TableHead>
                    <TableHead className="py-3 px-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">IP</TableHead>
                    <TableHead className="py-3 px-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground text-center">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adminLogs.map((log) => (
                    <TableRow key={log.id} className="hover:bg-muted/10 transition-colors border-border/30">
                      <TableCell className="py-3 px-4 text-xs font-semibold text-muted-foreground font-mono">
                        {formatDate(log.occurredAt)}
                      </TableCell>
                      <TableCell className="py-3 px-3 text-xs font-bold text-foreground">
                        {log.userFullName || log.userEmail || (log.userId ? `ID: ${log.userId}` : "Hệ thống")}
                      </TableCell>
                      <TableCell className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${getActionColor(log.action)}`}>
                          {log.action}
                        </span>
                      </TableCell>
                      <TableCell className="py-3 px-3 text-xs font-mono">
                        {log.entityType} {log.entityId ? log.entityId : ""}
                      </TableCell>
                      <TableCell className="py-3 px-3 text-xs font-mono text-muted-foreground">
                        {log.ipAddress || "—"}
                      </TableCell>
                      <TableCell className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            onClick={() => { setSelectedAdminLog(log); setAdminDetailModalOpen(true); }}
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-primary hover:bg-primary/10 cursor-pointer"
                            title="Xem chi tiết"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={() => { setAdminLogToDelete(log); setDeleteConfirmOpen(true); }}
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:bg-destructive/10 cursor-pointer"
                            title="Xóa nhật ký"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>

            {/* Phân trang nhật ký hệ thống theo dữ liệu phân trang từ backend. */}
            {totalPages > 1 && (
              <div className="px-5 py-3.5 border-t border-border/40 bg-card flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-medium">
                <span className="text-muted-foreground">
                  Hiển thị trang <strong className="text-foreground">{page + 1}</strong> trên <strong className="text-foreground">{totalPages}</strong> (Tổng {totalElements} bản ghi)
                </span>

                <div className="flex items-center gap-2">
                  <Button
                    disabled={page === 0 || loading}
                    onClick={() => setPage((current) => current - 1)}
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs font-semibold cursor-pointer"
                  >
                    <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Trước
                  </Button>
                  <span className="px-3 py-1 bg-muted rounded-lg font-bold">
                    {page + 1} / {totalPages}
                  </span>
                  <Button
                    disabled={page >= totalPages - 1 || loading}
                    onClick={() => setPage((current) => current + 1)}
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs font-semibold cursor-pointer"
                  >
                    Sau <ChevronRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      ) : (
        /* ===================================================
           STUDENT ACTIVITY LOG LAYOUT WITH TABS (Learning & System History)
           =================================================== */
        <div className="space-y-6">
          {/* Tab Switcher Header */}
          <div className="flex items-center gap-2 p-1.5 bg-muted/40 border border-border/50 rounded-2xl w-fit">
            <button
              onClick={() => handleStudentTabSwitch("LEARNING")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                studentTab === "LEARNING"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
            >
              <BookOpen className="h-4 w-4" />
              <span>Lịch sử học tập</span>
            </button>

            <button
              onClick={() => handleStudentTabSwitch("SYSTEM")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                studentTab === "SYSTEM"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
            >
              <Shield className="h-4 w-4" />
              <span>Lịch sử hệ thống</span>
            </button>
          </div>

          <Card className="border-border shadow-sm bg-card rounded-2xl overflow-hidden">
            <CardHeader className="pb-4 border-b border-border/40 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                  {studentTab === "LEARNING" ? (
                    <>
                      <BookOpen className="h-5 w-5 text-primary" />
                      Lịch sử xem bài giảng & học tập cá nhân
                    </>
                  ) : (
                    <>
                      <Shield className="h-5 w-5 text-primary" />
                      Lịch sử tương tác hệ thống & Đăng nhập
                    </>
                  )}
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  {studentTab === "LEARNING"
                    ? "Ghi nhận toàn bộ tiến độ xem video bài học, đánh dấu bài hoàn thành và tương tác học tập."
                    : "Nhật ký lưu vết thao tác cài đặt hệ thống, tài khoản và thời gian đăng nhập."}
                </CardDescription>
              </div>

              <Badge variant="outline" className="text-xs font-mono font-bold bg-primary/5 text-primary w-fit">
                {totalElements} bản ghi
              </Badge>
            </CardHeader>

            <CardContent className="p-0 relative min-h-60">
              {loading && (
                <div className="absolute inset-0 bg-background/60 backdrop-blur-xs flex items-center justify-center z-10">
                  <div className="flex items-center gap-2 text-xs font-bold text-primary">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Đang tải nhật ký...</span>
                  </div>
                </div>
              )}

              {studentLogs.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground text-xs flex flex-col items-center justify-center gap-2">
                  <Info className="h-8 w-8 text-muted-foreground/60" />
                  <span className="font-bold text-foreground">Chưa có nhật ký hoạt động nào trong danh mục này.</span>
                  <span>Mọi hoạt động tương tác mới sẽ tự động được ghi nhận tại đây.</span>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/20 border-border/40 text-xs">
                      <TableHead className="py-3 px-4 font-bold uppercase text-muted-foreground">Thời gian</TableHead>
                      <TableHead className="py-3 px-3 font-bold uppercase text-muted-foreground">Hành động</TableHead>
                      <TableHead className="py-3 px-3 font-bold uppercase text-muted-foreground">Thành phần liên quan</TableHead>
                      <TableHead className="py-3 px-3 font-bold uppercase text-muted-foreground">Thiết bị truy cập</TableHead>
                      <TableHead className="py-3 px-4 font-bold uppercase text-muted-foreground text-center">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody className="text-xs">
                    {studentLogs.map((item) => (
                      <TableRow key={item.id} className="hover:bg-muted/20 transition-colors border-border/30">
                        <TableCell className="py-3.5 px-4 font-mono text-muted-foreground font-medium">
                          {formatDate(item.occurredAt)}
                        </TableCell>

                        <TableCell className="py-3.5 px-3">
                          <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold border uppercase tracking-wider ${getActionColor(item.action)}`}>
                            {item.action}
                          </span>
                        </TableCell>

                        <TableCell className="py-3.5 px-3 font-medium">
                          <div className="flex flex-col">
                            <span className="font-bold text-foreground font-mono">{item.entityType || "N/A"}</span>
                            {item.entityId && (
                              <span className="text-[10px] text-muted-foreground font-mono">ID: {item.entityId}</span>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="py-3.5 px-3 font-mono text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <Monitor className="h-3.5 w-3.5 text-primary/70 shrink-0" />
                            <span>{item.device || item.ipAddress || "Thiết bị cá nhân"}</span>
                          </div>
                        </TableCell>

                        <TableCell className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              onClick={() => handleOpenStudentDetail(item)}
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-xs font-semibold text-primary hover:bg-primary/10 gap-1 cursor-pointer"
                              title="Xem chi tiết nhật ký này"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span>Chi tiết</span>
                            </Button>

                            {!isStaffActivity && <Button
                              onClick={() => setStudentLogToDelete({ id: item.id, type: studentTab })}
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-xs font-semibold text-destructive hover:bg-destructive/10 gap-1 cursor-pointer"
                              title="Xóa nhật ký này"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>Xóa</span>
                            </Button>}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>

            {/* Pagination for Student activities */}
            {totalPages > 1 && (
              <div className="px-5 py-3.5 border-t border-border/40 bg-card flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-medium">
                <span className="text-muted-foreground">
                  Hiển thị trang <strong className="text-foreground">{page + 1}</strong> trên <strong className="text-foreground">{totalPages}</strong> (Tổng {totalElements} bản ghi)
                </span>

                <div className="flex items-center gap-2">
                  <Button
                    disabled={page === 0}
                    onClick={() => setPage((p) => p - 1)}
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs font-semibold cursor-pointer"
                  >
                    <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Trước
                  </Button>

                  <span className="px-3 py-1 bg-muted rounded-lg font-bold">
                    {page + 1} / {totalPages}
                  </span>

                  <Button
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage((p) => p + 1)}
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs font-semibold cursor-pointer"
                  >
                    Sau <ChevronRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* STUDENT LOG DETAIL MODAL */}
      {selectedStudentLog && (
        <Dialog open={studentDetailModalOpen} onOpenChange={setStudentDetailModalOpen}>
          <DialogContent className="max-w-lg w-full rounded-2xl bg-card p-6 space-y-4 shadow-xl border border-border/40">
            <DialogHeader>
              <div className="flex items-center gap-2 text-primary mb-1">
                <FileJson className="h-5 w-5" />
                <DialogTitle className="text-base font-bold">
                  Chi tiết Lịch sử {selectedStudentLog.historyType === "LEARNING" ? "Học tập" : "Hệ thống"}
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-muted-foreground">
                Thông tin chi tiết của bản ghi nhật ký {selectedStudentLog.id}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-background border border-border/40 rounded-xl">
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block">Hành động</span>
                  <span className={`inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold border ${getActionColor(selectedStudentLog.action)}`}>
                    {selectedStudentLog.action}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block">Thời gian xảy ra</span>
                  <span className="font-mono font-bold text-foreground block mt-0.5">
                    {formatDate(selectedStudentLog.occurredAt)}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block">Thành phần liên quan</span>
                  <span className="font-mono font-bold text-foreground block mt-0.5">
                    {selectedStudentLog.entityType || "N/A"} {selectedStudentLog.entityId || ""}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block">Thiết bị truy cập</span>
                  <span className="font-mono text-foreground block mt-0.5 truncate">
                    {selectedStudentLog.device || "Chưa xác định"}
                  </span>
                </div>
              </div>

              {selectedStudentLog.metadata && (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block">Dữ liệu bổ sung (Metadata JSON)</span>
                  <pre className="p-3 bg-muted text-foreground rounded-xl font-mono text-[11px] overflow-x-auto border border-border/40">
                    {(() => {
                      const parsed = parseMetadataJson(selectedStudentLog.metadata);
                      return typeof parsed === "object" ? JSON.stringify(parsed, null, 2) : String(parsed);
                    })()}
                  </pre>
                </div>
              )}

              {selectedStudentLog.userAgent && (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block">User Agent</span>
                  <p className="p-2 bg-background border border-border/40 rounded-lg text-[11px] font-mono text-muted-foreground break-all">
                    {selectedStudentLog.userAgent}
                  </p>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 pt-2 border-t border-border/40">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  setStudentDetailModalOpen(false);
                  setStudentLogToDelete({ id: selectedStudentLog.id, type: studentTab });
                }}
                className="text-xs font-bold gap-1 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Xóa bản ghi này
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStudentDetailModalOpen(false)}
                className="text-xs font-bold cursor-pointer"
              >
                Đóng
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* STUDENT CONFIRM DELETE DIALOG */}
      {studentLogToDelete && (
        <Dialog open={!!studentLogToDelete} onOpenChange={() => setStudentLogToDelete(null)}>
          <DialogContent className="max-w-md w-full rounded-2xl bg-card p-6 space-y-3 border border-border/40">
            <DialogHeader>
              <div className="flex items-center gap-2 text-destructive mb-1">
                <Trash2 className="h-6 w-6" />
                <DialogTitle className="text-base font-bold">Xác nhận xóa bản ghi nhật ký</DialogTitle>
              </div>
              <DialogDescription className="text-xs text-muted-foreground">
                Bạn có chắc chắn muốn xóa bản ghi nhật ký ID {studentLogToDelete.id} khỏi hệ thống?
                <br />
                <span className="text-destructive font-semibold mt-1 block">Hành động này không thể hoàn tác.</span>
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStudentLogToDelete(null)}
                className="text-xs font-bold cursor-pointer"
              >
                Hủy bỏ
              </Button>

              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  handleDeleteStudentLog(studentLogToDelete.id, studentLogToDelete.type);
                  setStudentLogToDelete(null);
                }}
                className="text-xs font-bold cursor-pointer"
              >
                Xác nhận xóa
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ADMIN DETAIL MODAL */}
      <DetailAuditLogModal
        open={adminDetailModalOpen}
        onClose={() => setAdminDetailModalOpen(false)}
        log={selectedAdminLog}
      />

      {/* ADMIN CONFIRM DELETE DIALOG */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-md w-full rounded-2xl bg-card p-6 border border-border/40">
          <DialogHeader>
            <div className="flex items-center gap-3 text-destructive mb-1">
              <Trash2 className="h-7 w-7 shrink-0" />
              <DialogTitle className="text-lg font-black">Xác nhận xóa Nhật ký Kiểm toán</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed mt-1">
              {isBulkDeleting
                ? `Bạn có chắc chắn muốn xóa vĩnh viễn ${selectedLogIds.length} bản ghi nhật ký đã chọn khỏi hệ thống?`
                : `Bạn có chắc chắn muốn xóa vĩnh viễn bản ghi nhật ký ID ${adminLogToDelete?.id} khỏi hệ thống?`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmOpen(false)}
              className="font-bold text-xs cursor-pointer"
            >
              Hủy bỏ
            </Button>
            <Button
              onClick={() => {
                if (isBulkDeleting) {
                  handleBulkDeleteAdminLogs();
                } else if (adminLogToDelete) {
                  handleDeleteAdminLog(String(adminLogToDelete.id));
                }
                setDeleteConfirmOpen(false);
              }}
              variant="destructive"
              className="font-bold text-xs cursor-pointer"
            >
              Đồng ý xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};
