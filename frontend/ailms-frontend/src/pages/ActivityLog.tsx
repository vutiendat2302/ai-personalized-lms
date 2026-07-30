import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { UserRole } from "@/config/roles";
import { auditLogApi, type AuditLogResponse } from "@/api/audit/auditLogApi";
import { DatePickerInput } from "@/components/ui/DatePickerInput";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { DetailAuditLogModal } from "@/components/admin/audit/DetailAuditLogModal";
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
  ArrowUp,
  ArrowDown,
  Download,
  ChevronDown,
  CheckCircle2,
  X,
  Trash2
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";

const ENTITY_TYPE_OPTIONS = [
  "USER",
  "ROLE",
  "PERMISSION",
  "COURSE",
  "DEPARTMENT",
  "EMPLOYEE",
  "CLASSROOM",
  "ASSIGNMENT",
  "CONTRACT",
  "COUPON",
  "ORDER",
  "ATTENDANCE",
  "REVENUE",
  "SCHEDULE",
  "STUDENT"
];

const ACTION_OPTIONS = [
  "CREATE",
  "UPDATE",
  "DELETE",
  "LOGIN",
  "LOGIN_FAILED",
  "LOGOUT",
  "GRANT_ROLE",
  "REVOKE_ROLE",
  "TRANSFER_DEPARTMENT",
  "UPLOAD",
  "DOWNLOAD",
  "RESTORE"
];

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

  // Live Auto-refresh state
  const [isLive, setIsLive] = useState(false);

  // Data states
  const [logs, setLogs] = useState<AuditLogResponse[]>([]);
  const [selectedLogIds, setSelectedLogIds] = useState<string[]>([]);
  
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

  // Sorting (Same multi-column rule placeholder structure)
  const [sortRule, setSortRule] = useState<{ field: string; dir: "ASC" | "DESC" }>({
    field: "occurredAt",
    dir: "DESC"
  });

  // Modal Detail state
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLogResponse | null>(null);

  // Deletion states
  const [logToDelete, setLogToDelete] = useState<AuditLogResponse | null>(null);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const handleOpenDetailModal = (log: AuditLogResponse) => {
    setSelectedLog(log);
    setDetailModalOpen(true);
  };

  const handleDeleteLog = async (logId: string) => {
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

  const handleBulkDeleteLogs = async () => {
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

  // Synchronize jump page input state
  useEffect(() => {
    setJumpPageInput(String(page + 1));
  }, [page]);

  // Main fetch hook
  useEffect(() => {
    if (isAdmin) {
      fetchAdminLogs();
    } else if (currentUserId) {
      fetchUserLogs(currentUserId);
    }
  }, [isAdmin, currentUserId, page, pageSize, sortRule, debouncedKeyword, debouncedUserQuery]);

  // Auto-refresh interval (Live monitoring)
  useEffect(() => {
    if (!isLive || !isAdmin) return;
    const interval = setInterval(() => {
      fetchAdminLogs(true); // silent refresh
    }, 15000); // 15 seconds refresh rate
    return () => clearInterval(interval);
  }, [
    isLive,
    isAdmin,
    page,
    pageSize,
    debouncedKeyword,
    filterEntityType,
    selectedActions,
    debouncedUserQuery,
    filterIpAddress,
    filterStart,
    filterEnd,
    sortRule
  ]);

  const showBanner = (msg: string, isError = false) => {
    if (isError) {
      setErrorBanner(msg);
      setTimeout(() => setErrorBanner(""), 3500);
    } else {
      setSuccessBanner(msg);
      setTimeout(() => setSuccessBanner(""), 3500);
    }
  };

  const fetchUserLogs = async (userId: string) => {
    setLoading(true);
    try {
      const res = await auditLogApi.getAuditLogsByUserId(userId, {
        page,
        size: pageSize,
        sort: `${sortRule.field}:${sortRule.dir.toLowerCase()}`
      });
      if (res.data.success) {
        const pageData = res.data.data;
        setLogs(pageData.content || []);
        setTotalPages(pageData.totalPages || 0);
        setTotalElements(pageData.totalElements || 0);
      }
    } catch (err: any) {
      showBanner(err.message || "Không thể tải lịch sử hoạt động cá nhân", true);
    } finally {
      setLoading(false);
    }
  };

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
        setLogs(pageData.content || []);
        setTotalPages(pageData.totalPages || 0);
        setTotalElements(pageData.totalElements || 0);
        setSelectedLogIds([]); // clear selection when loading new dataset
      }
    } catch (err: any) {
      showBanner(err.message || "Không thể tải nhật ký hoạt động hệ thống", true);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  const handleApplyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    setDebouncedKeyword(searchKeyword);
    setDebouncedUserQuery(filterUserQuery);
    if (isAdmin) {
      fetchAdminLogs();
    }
  };

  const handleResetFilters = () => {
    setSearchKeyword("");
    setDebouncedKeyword("");
    setFilterEntityType("ALL");
    setSelectedActions([]);
    setFilterUserQuery("");
    setDebouncedUserQuery("");
    setFilterIpAddress("");
    setFilterStart("");
    setFilterEnd("");
    setPage(0);
    setSelectedLogIds([]);
    setTimeout(() => {
      if (isAdmin) {
        fetchAdminLogs();
      }
    }, 50);
  };

  const handleSortOccurredAt = () => {
    setSortRule((prev) => ({
      field: "occurredAt",
      dir: prev.dir === "DESC" ? "ASC" : "DESC"
    }));
    setPage(0);
  };

  const handleExportCSV = async () => {
    setLoading(true);
    try {
      const params: any = {
        sort: `${sortRule.field}:${sortRule.dir.toLowerCase()}`
      };
      if (debouncedKeyword.trim()) params.keyword = debouncedKeyword.trim();
      if (filterEntityType !== "ALL") params.entityType = filterEntityType;
      if (selectedActions.length > 0) params.actions = selectedActions;
      if (debouncedUserQuery.trim()) params.userQuery = debouncedUserQuery.trim();
      if (filterIpAddress.trim()) params.ipAddress = filterIpAddress.trim();
      if (filterStart) params.occurredFrom = new Date(filterStart).toISOString();
      if (filterEnd) params.occurredTo = new Date(filterEnd).toISOString();

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

  const handleExportSelectedCSV = () => {
    setLoading(true);
    try {
      const selectedLogs = logs.filter(l => selectedLogIds.includes(String(l.id)));
      if (selectedLogs.length === 0) return;

      const headers = [
        "STT", "ID", "Thời gian", "Tài khoản tác động", "Email", "Hành động",
        "Thực thể", "ID Thực thể", "Địa chỉ IP", "User Agent", "Giá trị cũ", "Giá trị mới"
      ];

      let csvContent = "\uFEFF" + headers.join(",") + "\n";
      selectedLogs.forEach((l, idx) => {
        const row = [
          idx + 1,
          l.id,
          formatDate(l.occurredAt),
          l.userFullName || "N/A",
          l.userEmail || "N/A",
          l.action,
          l.entityType,
          l.entityId,
          l.ipAddress,
          l.userAgent ? l.userAgent.replace(/"/g, '""') : "",
          l.oldValue ? l.oldValue.replace(/"/g, '""') : "",
          l.newValue ? l.newValue.replace(/"/g, '""') : ""
        ];
        const escapedRow = row.map(val => {
          const str = String(val);
          if (str.includes(",") || str.includes("\n") || str.includes('"')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        });
        csvContent += escapedRow.join(",") + "\n";
      });

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `selected_audit_logs_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      showBanner("Xuất báo cáo các bản ghi đã chọn thành công!");
    } catch (err: any) {
      showBanner(err.message || "Không thể xuất file báo cáo CSV", true);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAllLogs = (checked: boolean) => {
    if (checked) setSelectedLogIds(logs.map(l => String(l.id)));
    else setSelectedLogIds([]);
  };

  const handleSelectLog = (id: string) => {
    if (selectedLogIds.includes(id)) setSelectedLogIds(selectedLogIds.filter(i => i !== id));
    else setSelectedLogIds([...selectedLogIds, id]);
  };

  const getActionColor = (action: string) => {
    const act = action.toLowerCase();
    if (act.includes("create") || act.includes("add") || act.includes("insert")) {
      return "bg-green-500/10 text-green-600 border-green-500/20";
    }
    if (act.includes("update") || act.includes("edit") || act.includes("modify") || act.includes("transfer")) {
      return "bg-blue-500/10 text-blue-600 border-blue-500/20";
    }
    if (act.includes("delete") || act.includes("remove") || act.includes("destroy") || act.includes("clear")) {
      return "bg-red-500/10 text-red-600 border-red-500/20";
    }
    if (act.includes("login_failed")) {
      return "bg-orange-500/10 text-orange-600 border-orange-500/20";
    }
    if (act.includes("login") || act.includes("auth")) {
      return "bg-cyan-500/10 text-cyan-600 border-cyan-500/20";
    }
    return "bg-slate-500/10 text-slate-600 border-slate-500/20";
  };

  const formatDate = (dateStr: string) => {
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

  const getInitials = (name: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(-2)
      .join("")
      .toUpperCase();
  };

  return (
    <div className="mx-auto max-w-none w-full space-y-8 animate-in fade-in-50 duration-300">
      
      {/* Toast Alert Banner */}
      {errorBanner && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl bg-destructive text-white px-4 py-3 shadow-xl animate-in slide-in-from-bottom-5 duration-300">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span className="text-sm font-semibold">{errorBanner}</span>
          <button onClick={() => setErrorBanner("")} className="ml-2 hover:opacity-80">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {successBanner && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl bg-emerald-600 text-white px-4 py-3 shadow-xl animate-in slide-in-from-bottom-5 duration-300">
          <Info className="h-5 w-5 shrink-0" />
          <span className="text-sm font-semibold">{successBanner}</span>
          <button onClick={() => setSuccessBanner("")} className="ml-2 hover:opacity-80">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-primary mb-1">
            <Link to="/dashboard" className="flex items-center gap-1 hover:underline">
              <ArrowLeft className="h-3 w-3" />
              <span>Quay lại Dashboard</span>
            </Link>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            <span>{isAdmin ? "Nhật ký hoạt động hệ thống (Audit Logs)" : "Lịch sử hoạt động cá nhân"}</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isAdmin
              ? "Giám sát tất cả thay đổi dữ liệu, hành vi người dùng và bảo mật hệ thống."
              : "Theo dõi toàn bộ lịch sử đăng nhập, thay đổi thông tin cá nhân và hoạt động học tập của bạn."}
          </p>
        </div>
      </div>

      {/* Main Content Area */}
      {isAdmin ? (
        /* ===================================================
           ADMIN CONSOLE LAYOUT (Single-Card layout matching RoleManagement)
           =================================================== */
        <div className="space-y-6">
          <Card className="border-border shadow-sm bg-card overflow-hidden">
            
            {/* Header & Main Actions */}
            <CardHeader className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-border/30 bg-card">
              <div>
                <CardTitle className="text-xl font-semibold tracking-tight font-heading flex items-center gap-2">
                  <span>Danh sách Nhật ký hoạt động</span>
                </CardTitle>
                <CardDescription className="text-sm text-muted-foreground mt-0.5">
                  Tra cứu chi tiết các thao tác chỉnh sửa dữ liệu, đăng nhập, xoá dữ liệu trên hệ thống.
                </CardDescription>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Live Switch */}
                <div className="flex items-center gap-2 bg-muted/40 p-1.5 px-3 rounded-lg border border-border/50">
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isLive ? "bg-emerald-500" : "bg-muted-foreground"}`}></span>
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${isLive ? "bg-emerald-500" : "bg-muted-foreground"}`}></span>
                  </span>
                  <span className="text-xs font-bold select-none cursor-pointer" onClick={() => setIsLive(!isLive)}>
                    {isLive ? "LIVE Monitoring" : "Chế độ LIVE tắt"}
                  </span>
                  <Checkbox
                    checked={isLive}
                    onCheckedChange={(checked) => setIsLive(!!checked)}
                    className="h-4 w-4 rounded-md border-border/40"
                  />
                </div>

                <Button onClick={handleExportCSV} variant="outline" size="sm" className="h-9 gap-1.5 font-semibold cursor-pointer border border-border/30 bg-background text-foreground hover:bg-muted">
                  <Download className="h-4 w-4" /> <span>Xuất CSV tất cả</span>
                </Button>
              </div>
            </CardHeader>

            {/* UNIFIED FILTER & SEARCH TOOLBAR FORM (Style matching RoleManagement) */}
            <form onSubmit={handleApplyFilters} className="py-3 px-4 bg-muted/20 border-b border-border/30 flex flex-wrap items-end gap-3 w-full">
              {/* Keyword Search */}
              <div className="flex flex-col gap-1 flex-1 min-w-50">
                <Label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Từ khóa tìm kiếm</Label>
                <div className="relative w-full">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    type="text"
                    placeholder="Tìm trong hành động, IP..."
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    className="pl-8 h-9 text-sm border border-border/30 bg-background rounded-lg"
                  />
                </div>
              </div>

              {/* Entity Type Dropdown */}
              <div className="flex flex-col gap-1 w-37.5 shrink-0">
                <Label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Loại thực thể</Label>
                <Select value={filterEntityType} onValueChange={setFilterEntityType}>
                  <SelectTrigger className="h-9 text-sm border border-border/30 bg-background rounded-lg w-full">
                    <SelectValue placeholder="Tất cả" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Tất cả thực thể</SelectItem>
                    {ENTITY_TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>



              {/* Multi-Choice Actions Popover */}
              <div className="flex flex-col gap-1 w-44 shrink-0">
                <Label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Hành động</Label>
                <Popover>
                  <PopoverTrigger
                    nativeButton={true}
                    render={
                       <Button
                      variant="outline"
                      className="h-9 text-sm border border-border/30 bg-background rounded-lg flex items-center justify-between w-full text-left font-normal cursor-pointer"
                      >
                        <span className="truncate">
                          {selectedActions.length > 0
                            ? `${selectedActions.length} đã chọn`
                            : "Tất cả hành động"}
                        </span>
                        <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
                      </Button>
                    }
                  />
                  <PopoverContent className="w-56 p-2 bg-popover border border-border shadow-xl rounded-xl">
                    <div className="font-bold mb-2 pb-1 border-b border-border/40 text-foreground text-[10px] uppercase tracking-wider">Chọn hành động</div>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {ACTION_OPTIONS.map((act) => (
                        <label key={act} className="flex items-center gap-2 cursor-pointer text-xs p-1 hover:bg-muted rounded select-none">
                          <Checkbox
                            checked={selectedActions.includes(act)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedActions(prev => [...prev, act]);
                              } else {
                                setSelectedActions(prev => prev.filter(a => a !== act));
                              }
                            }}
                            className="h-3.5 w-3.5 rounded"
                          />
                          <span className="font-semibold text-[10px]">{act}</span>
                        </label>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* User Search Input */}
              <div className="flex flex-col gap-1 flex-1 min-w-44">
                <Label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Tài khoản</Label>
                <Input
                  type="text"
                  placeholder="Nhập tên/email..."
                  value={filterUserQuery}
                  onChange={(e) => setFilterUserQuery(e.target.value)}
                  className="h-9 text-sm border border-border/30 bg-background rounded-lg"
                />
              </div>

              {/* IP Address Input */}
              <div className="flex flex-col gap-1 w-32 shrink-0">
                <Label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Địa chỉ IP</Label>
                <Input
                  type="text"
                  placeholder="E.g. 192.168"
                  value={filterIpAddress}
                  onChange={(e) => setFilterIpAddress(e.target.value)}
                  className="h-9 text-sm border border-border/30 bg-background rounded-lg font-mono"
                />
              </div>

              {/* Date Pickers */}
              <div className="w-35 shrink-0">
                <DatePickerInput
                  label="Từ ngày tạo"
                  placeholder="dd/mm/yyyy"
                  value={filterStart}
                  onChange={(isoDate) => {
                    setFilterStart(isoDate);
                    setPage(0);
                  }}
                />
              </div>

              <div className="w-35 shrink-0">
                <DatePickerInput
                  label="Đến ngày tạo"
                  placeholder="dd/mm/yyyy"
                  value={filterEnd}
                  onChange={(isoDate) => {
                    setFilterEnd(isoDate);
                    setPage(0);
                  }}
                />
              </div>

              {/* Filter Action Buttons */}
              <div className="flex items-center gap-1.5 shrink-0 self-end">
                <Button type="submit" size="sm" className="h-9 font-semibold bg-primary text-primary-foreground text-xs rounded-lg px-3 cursor-pointer">
                  <Search className="h-3.5 w-3.5 mr-1" /> Lọc
                </Button>
                <Button type="button" onClick={handleResetFilters} variant="outline" size="sm" className="h-9 text-xs text-muted-foreground hover:text-foreground rounded-lg px-2.5 border border-border/30 bg-background flex items-center gap-1 cursor-pointer">
                  <RotateCcw className="h-3.5 w-3.5 mr-1" /> Đặt lại
                </Button>
              </div>
            </form>

            {/* BULK ACTION TOOLBAR (Export selected logs) */}
            {selectedLogIds.length > 0 && (
              <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-primary/10 border-b border-primary/20 text-xs animate-in fade-in-50 duration-200">
                <div className="flex items-center gap-2 font-bold text-primary">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Đã chọn {selectedLogIds.length} bản ghi nhật ký</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    onClick={() => setSelectedLogIds([])}
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs font-semibold text-muted-foreground hover:text-foreground border-border/40 bg-background rounded-lg cursor-pointer gap-1"
                  >
                    <X className="h-3.5 w-3.5" />
                    <span>Bỏ chọn tất cả</span>
                  </Button>
                  <Button
                    onClick={handleExportSelectedCSV}
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs font-semibold gap-1.5 border-primary/30 text-primary hover:bg-primary/10 rounded-lg cursor-pointer shadow-xs"
                  >
                    <Download className="h-3.5 w-3.5" /> Xuất CSV đã chọn ({selectedLogIds.length})
                  </Button>
                  {isAdmin && (
                    <Button
                      onClick={() => {
                        setIsBulkDeleting(true);
                        setDeleteConfirmOpen(true);
                      }}
                      size="sm"
                      variant="destructive"
                      className="h-7 text-xs font-semibold gap-1.5 rounded-lg cursor-pointer shadow-xs"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Xóa vĩnh viễn ({selectedLogIds.length})
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Audit Logs Table (CardContent style) */}
            <CardContent className="p-0 relative min-h-75">
              {loading && (
                <div className="absolute inset-0 bg-background/55 backdrop-blur-xs flex items-center justify-center z-20">
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                </div>
              )}

              <Table containerClassName="max-h-[calc(100vh-280px)] min-h-[300px] overflow-auto border-b border-border/20">
                <TableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur-md shadow-2xs border-b border-border/40">
                  <TableRow className="border-b border-border/30 bg-muted/20 hover:bg-muted/20">
                    {/* Checkbox Header */}
                    <TableHead className="w-8 pb-4">
                      <Checkbox checked={logs.length > 0 && selectedLogIds.length === logs.length} onCheckedChange={(checked) => handleSelectAllLogs(!!checked)} className="translate-y-0.5 border-border/30" />
                    </TableHead>

                    {/* Thời gian Header with sort icon */}
                    <TableHead
                      className="cursor-pointer select-none py-3 px-4 text-sm font-semibold uppercase tracking-wider group"
                      onClick={handleSortOccurredAt}
                    >
                      <div className="flex items-center gap-1.5 pl-2">
                        <span className="text-primary font-bold">Thời gian</span>
                        {sortRule.dir === "DESC" ? (
                          <ArrowDown className="h-3.5 w-3.5 text-primary" />
                        ) : (
                          <ArrowUp className="h-3.5 w-3.5 text-primary" />
                        )}
                      </div>
                    </TableHead>

                    <TableHead className="py-3 px-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Tài khoản tác động</TableHead>
                    <TableHead className="py-3 px-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Hành động</TableHead>
                    <TableHead className="py-3 px-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Thực thể (ID)</TableHead>
                    <TableHead className="py-3 px-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Địa chỉ IP</TableHead>
                    <TableHead className="py-3 px-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody className="opacity-90">
                  {logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-16 text-center text-muted-foreground text-sm">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <AlertCircle className="h-10 w-10 text-muted-foreground/60" />
                          <span className="font-bold">Không tìm thấy nhật ký hoạt động nào</span>
                          <span className="text-xs">Hãy thử thay đổi điều kiện lọc hoặc từ khóa tìm kiếm.</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.map((log) => (
                      <TableRow key={log.id} className="hover:bg-muted/10 transition-colors border-border/30">
                        {/* Checkbox Cell */}
                        <TableCell>
                          <Checkbox checked={selectedLogIds.includes(String(log.id))} onCheckedChange={() => handleSelectLog(String(log.id))} className="translate-y-0.5 border-border/30" />
                        </TableCell>

                        {/* Thời gian cell */}
                        <TableCell className="py-3 px-4 text-xs font-semibold text-muted-foreground font-mono pl-6">
                          {formatDate(log.occurredAt)}
                        </TableCell>

                        {/* Tài khoản cell */}
                        <TableCell className="py-3 px-3">
                          <div className="flex items-center gap-2.5">
                            <Avatar className="h-8 w-8 border border-border/40">
                              <AvatarImage src={log.userAvatarUrl} alt={log.userFullName} />
                              <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                                {getInitials(log.userFullName)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-bold text-foreground text-xs">{log.userFullName || "Hệ thống / Guest"}</p>
                              <p className="text-[10px] text-muted-foreground">{log.userEmail || `ID: ${log.userId}`}</p>
                            </div>
                          </div>
                        </TableCell>

                        {/* Hành động cell */}
                        <TableCell className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${getActionColor(log.action)}`}>
                            {log.action}
                          </span>
                        </TableCell>

                        {/* Thực thể cell */}
                        <TableCell className="py-3 px-3">
                          <div className="flex flex-col">
                            <span className="font-bold text-xs text-foreground uppercase font-mono">{log.entityType || "N/A"}</span>
                            <span className="text-[10px] text-muted-foreground">ID: #{log.entityId}</span>
                          </div>
                        </TableCell>

                        {/* IP cell */}
                        <TableCell className="py-3 px-3 text-xs text-muted-foreground font-mono">
                          {log.ipAddress || "—"}
                        </TableCell>

                        {/* View action cell */}
                        <TableCell className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <Button
                              onClick={() => handleOpenDetailModal(log)}
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-primary hover:bg-primary/10 cursor-pointer"
                              title="Xem chi tiết thay đổi"
                            >
                              <Eye className="h-4.5 w-4.5" />
                            </Button>
                            {isAdmin && (
                              <Button
                                onClick={() => {
                                  setLogToDelete(log);
                                  setIsBulkDeleting(false);
                                  setDeleteConfirmOpen(true);
                                }}
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:bg-destructive/10 cursor-pointer"
                                title="Xóa bản ghi nhật ký"
                              >
                                <Trash2 className="h-4.5 w-4.5" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>

            {/* Pagination Footer (Style matching RoleManagement) */}
            <div className="px-5 py-3 border-t border-border/40 bg-card flex flex-col md:flex-row items-center justify-between gap-4 text-sm font-medium">
              <div className="text-muted-foreground">
                Hiển thị <span className="font-semibold text-foreground">{logs.length === 0 ? 0 : page * pageSize + 1}</span> đến{" "}
                <span className="font-semibold text-foreground">{Math.min((page + 1) * pageSize, totalElements)}</span> trên{" "}
                <span className="font-semibold text-foreground">{totalElements}</span> bản ghi
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Số dòng/trang:</span>
                  <Select value={String(pageSize)} onValueChange={(val) => { setPageSize(Number(val)); setPage(0); }}>
                    <SelectTrigger className="h-8 w-16 text-xs bg-background border border-border rounded-lg font-bold">
                      <SelectValue placeholder={String(pageSize)} />
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
                    if (!isNaN(pNum) && pNum >= 1 && pNum <= totalPages) setPage(pNum - 1);
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
                  <Button disabled={page === 0} onClick={() => setPage(p => p - 1)} variant="outline" size="sm" className="h-8 text-xs font-semibold rounded-lg cursor-pointer">
                    <ChevronLeft className="h-3.5 w-3.5" /> Trước
                  </Button>
                  {getPageNumbers(page, totalPages).map((p, idx) => {
                    if (p === "...") return <span key={`dots-${idx}`} className="px-1 text-muted-foreground">...</span>;
                    const pageNum = p as number;
                    const isCurrent = pageNum === page;
                    return (
                      <Button key={pageNum} onClick={() => setPage(pageNum)} variant={isCurrent ? "default" : "outline"} size="sm" className="h-8 w-8 text-xs font-semibold rounded-lg cursor-pointer">
                        {pageNum + 1}
                      </Button>
                    );
                  })}
                  <Button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} variant="outline" size="sm" className="h-8 text-xs font-semibold rounded-lg cursor-pointer">
                    Sau <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Retention Note (UX touch) */}
            <div className="bg-muted/10 p-2.5 px-4 text-[10px] text-muted-foreground border-t border-border/20 flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5 text-primary/60 shrink-0" />
              <span>Chính sách lưu trữ: Hệ thống lưu trữ lịch sử hoạt động trong vòng 90 ngày để phục vụ việc kiểm toán bảo mật và tuân thủ.</span>
            </div>
          </Card>
        </div>
      ) : (
        /* ===================================================
           USER TIMELINE LAYOUT (Chronological activity map with pagination)
           =================================================== */
        <div className="space-y-6">
          <Card className="border-border shadow-sm bg-card">
            <CardHeader className="pb-4 border-b border-border/85">
              <CardTitle className="text-base font-bold">Lịch trình hoạt động của bạn</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Xem lại các thao tác, lịch sử đăng nhập và tương tác gần đây của bạn.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-6 relative min-h-62.5">
              {loading && (
                <div className="absolute inset-0 bg-background/55 backdrop-blur-xs flex items-center justify-center z-10">
                  <Loader2 className="h-6 w-6 text-primary animate-spin" />
                </div>
              )}

              {logs.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground text-sm flex flex-col items-center justify-center gap-2">
                  <Info className="h-8 w-8 text-muted-foreground/60" />
                  <span>Không có hoạt động nào được ghi nhận.</span>
                </div>
              ) : (
                <div className="relative pl-6 border-l border-border/80 space-y-8 py-2">
                  {logs.map((log) => (
                    <div key={log.id} className="relative group animate-in fade-in duration-200">
                      
                      {/* Timeline Node Bullet */}
                      <div className="absolute -left-7.75 top-0 h-4.5 w-4.5 rounded-full bg-card border-2 border-primary flex items-center justify-center shadow-xs">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                      </div>

                      {/* Timeline Details Box */}
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold text-foreground">
                            Bạn đã thực hiện hành động:
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${getActionColor(log.action)}`}>
                            {log.action}
                          </span>
                          
                          {/* Occurred date */}
                          <div className="text-[10px] text-muted-foreground flex items-center gap-1 ml-auto">
                            <Clock className="h-3 w-3" />
                            <span className="font-mono">{formatDate(log.occurredAt)}</span>
                          </div>
                        </div>

                        {/* Entity Description */}
                        <p className="text-xs text-muted-foreground font-medium">
                          Tác động lên thực thể <span className="font-bold text-foreground uppercase font-mono">{log.entityType || "N/A"}</span> (ID: #{log.entityId})
                        </p>

                        {/* Open modal details trigger */}
                        <button
                          onClick={() => handleOpenDetailModal(log)}
                          className="text-[10px] text-primary font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
                        >
                          Xem chi tiết cấu hình thay đổi & thiết bị
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>

            {/* Pagination for User timeline */}
            {totalPages > 1 && (
              <div className="px-5 py-3 border-t border-border/40 bg-card flex items-center justify-between gap-4 text-xs font-medium">
                <span className="text-muted-foreground">Tổng số {totalElements} hoạt động</span>
                <div className="flex items-center gap-1">
                  <Button disabled={page === 0} onClick={() => setPage(p => p - 1)} variant="outline" size="sm" className="h-8 text-xs font-semibold rounded-lg cursor-pointer">
                    Trước
                  </Button>
                  <span className="text-xs font-semibold py-1 px-3 bg-muted rounded">Trang {page + 1} / {totalPages}</span>
                  <Button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} variant="outline" size="sm" className="h-8 text-xs font-semibold rounded-lg cursor-pointer">
                    Sau
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* DETAIL MODAL WITH JSON DIFF */}
      <DetailAuditLogModal
        open={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        log={selectedLog}
      />

      {/* Confirm Delete Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-md w-full rounded-2xl bg-card p-6">
          <DialogHeader>
            <div className="flex items-center gap-3 text-red-600 mb-1">
              <Trash2 className="h-7 w-7 shrink-0" />
              <DialogTitle className="text-lg font-black">Xác nhận xóa Nhật ký Kiểm toán</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed mt-1">
              {isBulkDeleting
                ? `Bạn có chắc chắn muốn xóa vĩnh viễn ${selectedLogIds.length} bản ghi nhật ký đã chọn khỏi hệ thống?`
                : `Bạn có chắc chắn muốn xóa vĩnh viễn bản ghi nhật ký #${logToDelete?.id} khỏi hệ thống?`}
              <br />
              <strong className="text-red-500 font-bold mt-1 block">CẢNH BÁO: Hành động này sẽ thực hiện DELETE cứng trong cơ sở dữ liệu và không thể khôi phục!</strong>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmOpen(false)}
              className="font-bold text-xs"
            >
              Hủy bỏ
            </Button>
            <Button
              onClick={() => {
                if (isBulkDeleting) {
                  handleBulkDeleteLogs();
                } else if (logToDelete) {
                  handleDeleteLog(String(logToDelete.id));
                }
                setDeleteConfirmOpen(false);
              }}
              variant="destructive"
              className="font-bold text-xs"
            >
              Đồng ý xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};
