import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { UserRole } from "@/config/roles";
import { auditLogApi, type AuditLogResponse } from "@/api/audit/auditLogApi";
import {
  Activity,
  ArrowLeft,
  Filter,
  Info,
  Loader2,
  AlertCircle,
  Clock,
  Laptop,
  Globe,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  X
} from "lucide-react";

export const ActivityLog: React.FC = () => {
  const { auth } = useAuth();
  const isAdmin = auth.user?.roles.includes(UserRole.ADMIN);
  const currentUserId = auth.user ? parseInt(auth.user.id) : null;

  // Banners
  const [errorBanner, setErrorBanner] = useState("");

  // Loading state
  const [loading, setLoading] = useState(false);

  // Data states
  const [logs, setLogs] = useState<AuditLogResponse[]>([]);
  
  // Pagination & Search for Admin
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  // Admin filter states
  const [filterEntityType, setFilterEntityType] = useState("");
  const [filterEntityId, setFilterEntityId] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [filterStart, setFilterStart] = useState("");
  const [filterEnd, setFilterEnd] = useState("");

  // Modal / Detail state
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);

  useEffect(() => {
    if (isAdmin) {
      fetchAdminLogs();
    } else if (currentUserId) {
      fetchUserLogs(currentUserId);
    }
  }, [isAdmin, currentUserId, page]);

  const fetchUserLogs = async (userId: number) => {
    setLoading(true);
    try {
      const res = await auditLogApi.getAuditLogsByUserId(userId);
      if (res.data.success) {
        setLogs(res.data.data || []);
      }
    } catch (err: any) {
      setErrorBanner(err.message || "Không thể tải lịch sử hoạt động cá nhân");
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminLogs = async () => {
    setLoading(true);
    try {
      const params: any = {
        page,
        size: 10,
        sort: "id,desc"
      };
      if (filterEntityType) params.entityType = filterEntityType;
      if (filterEntityId) params.entityId = parseInt(filterEntityId);
      if (filterAction) params.action = filterAction;
      if (filterStart) params.start = new Date(filterStart).toISOString();
      if (filterEnd) params.end = new Date(filterEnd).toISOString();

      const res = await auditLogApi.getAuditLogs(params);
      if (res.data.success) {
        const pageData = res.data.data;
        setLogs(pageData.content || []);
        setTotalPages(pageData.totalPages || 0);
        setTotalElements(pageData.totalElements || 0);
      }
    } catch (err: any) {
      setErrorBanner(err.message || "Không thể tải nhật ký hoạt động hệ thống");
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = () => {
    setPage(0);
    fetchAdminLogs();
  };

  const handleResetFilters = () => {
    setFilterEntityType("");
    setFilterEntityId("");
    setFilterAction("");
    setFilterStart("");
    setFilterEnd("");
    setPage(0);
    // Timeout to make sure state is set
    setTimeout(() => {
      fetchAdminLogs();
    }, 50);
  };

  const getActionColor = (action: string) => {
    const act = action.toLowerCase();
    if (act.includes("create") || act.includes("add") || act.includes("insert")) {
      return "bg-green-500/10 text-green-600 border-green-500/20";
    }
    if (act.includes("update") || act.includes("edit") || act.includes("modify")) {
      return "bg-amber-500/10 text-amber-600 border-amber-500/20";
    }
    if (act.includes("delete") || act.includes("remove") || act.includes("destroy")) {
      return "bg-destructive/10 text-destructive border-destructive/20";
    }
    if (act.includes("login") || act.includes("auth")) {
      return "bg-blue-500/10 text-blue-600 border-blue-500/20";
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

  const tryFormatJSON = (str: string | null) => {
    if (!str) return "N/A";
    try {
      const parsed = JSON.parse(str);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return str;
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 animate-in fade-in-50 duration-300">
      
      {/* Banner */}
      {errorBanner && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl bg-destructive text-white px-4 py-3 shadow-xl animate-in slide-in-from-bottom-5 duration-300">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span className="text-sm font-semibold">{errorBanner}</span>
          <button onClick={() => setErrorBanner("")} className="ml-2 hover:opacity-80">
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
              : "Theo dõi toàn bộ lịch sử đăng nhập, thay đổi thông tin cá nhân và hoạt động học tập."}
          </p>
        </div>

        <Button
          onClick={() => (isAdmin ? fetchAdminLogs() : currentUserId && fetchUserLogs(currentUserId))}
          variant="outline"
          size="sm"
          className="h-9 gap-1.5"
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          <span>Làm mới</span>
        </Button>
      </div>

      {/* Main Content Area */}
      {isAdmin ? (
        /* ===================================================
           ADMIN CONSOLE LAYOUT (Filter + Paginated Search Grid)
           =================================================== */
        <div className="space-y-6">
          <Card className="border-border shadow-sm bg-card">
            <CardHeader className="pb-3 border-b border-border/80">
              <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-foreground">
                <Filter className="h-4 w-4 text-primary" />
                <span>Bộ lọc Tìm kiếm</span>
              </CardTitle>
            </CardHeader>

            <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-muted-foreground">Loại thực thể</Label>
                <Input
                  type="text"
                  placeholder="E.g. USER, COURSE"
                  value={filterEntityType}
                  onChange={(e) => setFilterEntityType(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-muted-foreground">ID Thực thể</Label>
                <Input
                  type="number"
                  placeholder="E.g. 1"
                  value={filterEntityId}
                  onChange={(e) => setFilterEntityId(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-muted-foreground">Hành động</Label>
                <Input
                  type="text"
                  placeholder="E.g. UPDATE_USER"
                  value={filterAction}
                  onChange={(e) => setFilterAction(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-muted-foreground">Thời gian bắt đầu</Label>
                <Input
                  type="datetime-local"
                  value={filterStart}
                  onChange={(e) => setFilterStart(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-muted-foreground">Thời gian kết thúc</Label>
                <Input
                  type="datetime-local"
                  value={filterEnd}
                  onChange={(e) => setFilterEnd(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="sm:col-span-2 md:col-span-5 flex justify-end gap-2 pt-2 border-t border-border/60">
                <Button onClick={handleResetFilters} variant="outline" size="sm" className="h-8 text-xs font-bold">
                  Khôi phục
                </Button>
                <Button onClick={handleApplyFilters} size="sm" className="h-8 text-xs font-bold bg-primary text-primary-foreground">
                  Áp dụng bộ lọc
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Audit Logs Table */}
          <Card className="border-border shadow-sm bg-card overflow-hidden">
            <CardContent className="p-0 relative">
              {loading && (
                <div className="absolute inset-0 bg-background/50 backdrop-blur-xs flex items-center justify-center z-10">
                  <Loader2 className="h-6 w-6 text-primary animate-spin" />
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b border-border/85 text-muted-foreground text-xs font-semibold bg-muted/10">
                      <th className="py-3 px-4">Thời gian</th>
                      <th className="py-3 px-2">Tài khoản tác động</th>
                      <th className="py-3 px-2">Hành động</th>
                      <th className="py-3 px-2">Thực thể (ID)</th>
                      <th className="py-3 px-2">Địa chỉ IP</th>
                      <th className="py-3 px-4 text-right">Chi tiết</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {logs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-muted-foreground text-sm">
                          Không tìm thấy nhật ký hoạt động nào.
                        </td>
                      </tr>
                    ) : (
                      logs.map((log) => (
                        <React.Fragment key={log.id}>
                          <tr className="hover:bg-muted/10 transition-colors">
                            <td className="py-3 px-4 text-xs font-semibold text-muted-foreground">
                              {formatDate(log.occurredAt)}
                            </td>
                            <td className="py-3 px-2">
                              <div>
                                <p className="font-bold text-foreground text-xs">{log.userFullName || "N/A"}</p>
                                <p className="text-[10px] text-muted-foreground">{log.userEmail || `ID: ${log.userId}`}</p>
                              </div>
                            </td>
                            <td className="py-3 px-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${getActionColor(log.action)}`}>
                                {log.action}
                              </span>
                            </td>
                            <td className="py-3 px-2">
                              <span className="font-semibold text-xs text-foreground uppercase">{log.entityType}</span>
                              <span className="text-[10px] text-muted-foreground ml-1">({log.entityId})</span>
                            </td>
                            <td className="py-3 px-2 text-xs text-muted-foreground font-mono">
                              {log.ipAddress}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <Button
                                onClick={() => {
                                  setExpandedLogId(expandedLogId === log.id ? null : log.id);
                                }}
                                variant="ghost"
                                size="xs"
                                className="h-7 w-7 p-0"
                              >
                                {expandedLogId === log.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </Button>
                            </td>
                          </tr>

                          {/* Detail Dropdown row */}
                          {expandedLogId === log.id && (
                            <tr className="bg-muted/5">
                              <td colSpan={6} className="p-4 border-b border-border/80">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs animate-in slide-in-from-top-2 duration-150">
                                  {/* Metadata */}
                                  <div className="space-y-2 md:col-span-2 p-2.5 rounded-lg bg-muted/40 border border-border/50 flex flex-wrap gap-x-6 gap-y-2">
                                    <div className="flex items-center gap-1 text-muted-foreground">
                                      <Laptop className="h-3.5 w-3.5" />
                                      <span className="font-bold">Trình duyệt:</span>
                                      <span className="truncate max-w-xs">{log.userAgent}</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-muted-foreground">
                                      <Globe className="h-3.5 w-3.5" />
                                      <span className="font-bold">Địa chỉ IP:</span>
                                      <span>{log.ipAddress}</span>
                                    </div>
                                  </div>

                                  {/* Compare values */}
                                  <div className="space-y-1">
                                    <span className="font-bold text-muted-foreground block">Giá trị Cũ (Old Value)</span>
                                    <pre className="p-3 bg-card border border-border rounded-lg text-[10px] font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">
                                      {tryFormatJSON(log.oldValue)}
                                    </pre>
                                  </div>

                                  <div className="space-y-1">
                                    <span className="font-bold text-muted-foreground block text-green-600">Giá trị Mới (New Value)</span>
                                    <pre className="p-3 bg-card border border-green-500/10 rounded-lg text-[10px] font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">
                                      {tryFormatJSON(log.newValue)}
                                    </pre>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-border flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Tổng số: {totalElements} log</span>
                <div className="flex gap-2">
                  <Button
                    disabled={page === 0}
                    onClick={() => setPage(prev => prev - 1)}
                    variant="outline"
                    size="sm"
                    className="h-8"
                  >
                    Trước
                  </Button>
                  <span className="text-xs font-semibold py-1 px-3 bg-muted rounded">Trang {page + 1} / {totalPages}</span>
                  <Button
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage(prev => prev + 1)}
                    variant="outline"
                    size="sm"
                    className="h-8"
                  >
                    Sau
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      ) : (
        /* ===================================================
           USER TIMELINE LAYOUT (Chronological activity map)
           =================================================== */
        <Card className="border-border shadow-sm bg-card">
          <CardHeader className="pb-4 border-b border-border/80">
            <CardTitle className="text-base font-bold">Lịch trình hoạt động của bạn</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Xem lại các thao tác, lịch sử đăng nhập và tương tác gần đây.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 relative min-h-[250px]">
            {loading && (
              <div className="absolute inset-0 bg-background/50 backdrop-blur-xs flex items-center justify-center z-10">
                <Loader2 className="h-6 w-6 text-primary animate-spin" />
              </div>
            )}

            {logs.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-sm flex flex-col items-center justify-center gap-2">
                <Info className="h-8 w-8 text-muted-foreground/60" />
                <span>Không có hoạt động nào được ghi nhận.</span>
              </div>
            ) : (
              <div className="relative pl-6 border-l border-border/80 space-y-8 py-2">
                {logs.map((log) => (
                  <div key={log.id} className="relative group animate-in fade-in duration-200">
                    
                    {/* Timeline Node Bullet */}
                    <div className="absolute -left-[31px] top-0 h-4.5 w-4.5 rounded-full bg-card border-2 border-primary flex items-center justify-center shadow-xs">
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
                          <span>{formatDate(log.occurredAt)}</span>
                        </div>
                      </div>

                      {/* Entity Description */}
                      <p className="text-xs text-muted-foreground font-medium">
                        Tác động lên thực thể <span className="font-bold text-foreground uppercase">{log.entityType}</span> (ID: #{log.entityId})
                      </p>

                      {/* Expand Details Trigger */}
                      <button
                        onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                        className="text-[10px] text-primary font-bold hover:underline flex items-center gap-0.5"
                      >
                        {expandedLogId === log.id ? "Ẩn thông tin cấu hình" : "Xem chi tiết thiết bị & cấu hình thay đổi"}
                      </button>

                      {/* Expanded values */}
                      {expandedLogId === log.id && (
                        <div className="mt-3 p-3.5 rounded-lg border border-border bg-muted/30 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs animate-in slide-in-from-top-2 duration-150">
                          {/* Device Metadata */}
                          <div className="sm:col-span-2 flex flex-wrap gap-4 text-[10px] text-muted-foreground border-b border-border/60 pb-2">
                            <span className="flex items-center gap-1 font-medium"><Laptop className="h-3 w-3" /> Trình duyệt: {log.userAgent}</span>
                            <span className="flex items-center gap-1 font-medium"><Globe className="h-3 w-3" /> Địa chỉ IP: {log.ipAddress}</span>
                          </div>

                          <div className="space-y-1">
                            <span className="font-bold text-muted-foreground block text-[10px]">Cấu hình trước thay đổi:</span>
                            <pre className="p-2.5 bg-card border border-border rounded text-[10px] font-mono max-h-36 overflow-y-auto whitespace-pre-wrap">
                              {tryFormatJSON(log.oldValue)}
                            </pre>
                          </div>

                          <div className="space-y-1">
                            <span className="font-bold text-muted-foreground block text-[10px]">Cấu hình sau thay đổi:</span>
                            <pre className="p-2.5 bg-card border border-border rounded text-[10px] font-mono max-h-36 overflow-y-auto whitespace-pre-wrap">
                              {tryFormatJSON(log.newValue)}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

    </div>
  );
};
