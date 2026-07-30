import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Laptop,
  Globe,
  User,
  Info,
  FileText,
  History,
  Plus,
  Minus,
  Edit,
  Loader2,
  AlertCircle,
  Copy,
  Check
} from "lucide-react";
import { auditLogApi, type AuditLogResponse } from "@/api/audit/auditLogApi";

interface DetailAuditLogModalProps {
  open: boolean;
  onClose: () => void;
  log: AuditLogResponse | null;
}

export const DetailAuditLogModal: React.FC<DetailAuditLogModalProps> = ({
  open,
  onClose,
  log
}) => {
  const [showChangesOnly, setShowChangesOnly] = useState(true);
  const [detailedLog, setDetailedLog] = useState<AuditLogResponse | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [errorDetail, setErrorDetail] = useState("");
  const [copiedIp, setCopiedIp] = useState(false);
  const [copiedUa, setCopiedUa] = useState(false);
  const contentRef = React.useRef<HTMLDivElement>(null);

  // Scroll back to top when opening a new detail log
  useEffect(() => {
    if (open && contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  }, [log?.id, open]);

  useEffect(() => {
    if (!open || !log?.id) {
      setDetailedLog(null);
      setErrorDetail("");
      return;
    }

    const fetchDetail = async () => {
      setLoadingDetail(true);
      setErrorDetail("");
      try {
        const res = await auditLogApi.getByLogId(log.id);
        if (res.data?.success && res.data?.data) {
          setDetailedLog(res.data.data);
        } else {
          setErrorDetail(res.data?.message || "Không thể tải chi tiết hoàn tất từ server.");
        }
      } catch (err: any) {
        console.error("Failed to fetch audit log detail", err);
        setErrorDetail(err.message || "Lỗi kết nối khi tải chi tiết hoạt động.");
      } finally {
        setLoadingDetail(false);
      }
    };

    fetchDetail();
  }, [log?.id, open]);

  if (!log) return null;

  const currentLog = detailedLog || log;

  const tryParseJSON = (str: string | null) => {
    if (!str) return null;
    try {
      let parsed = JSON.parse(str);
      // Handle double-escaped / double-stringified JSON strings from backend
      if (typeof parsed === "string") {
        try {
          const secondParse = JSON.parse(parsed);
          if (typeof secondParse === "object" && secondParse !== null) {
            return secondParse;
          }
        } catch {
          // ignore
        }
      }
      if (typeof parsed === "object" && parsed !== null) {
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  };

  const oldJson = tryParseJSON(currentLog.oldValue);
  const newJson = tryParseJSON(currentLog.newValue);
  const isJsonDiff = oldJson !== null || newJson !== null;

  const getDiffProperties = () => {
    if (!isJsonDiff) return [];
    const keys = new Set([
      ...Object.keys(oldJson || {}),
      ...Object.keys(newJson || {})
    ]);

    const result: Array<{
      key: string;
      oldVal: any;
      newVal: any;
      status: "added" | "removed" | "modified" | "unchanged";
    }> = [];

    keys.forEach((key) => {
      const hasOld = oldJson && Object.prototype.hasOwnProperty.call(oldJson, key);
      const hasNew = newJson && Object.prototype.hasOwnProperty.call(newJson, key);
      const oldVal = hasOld ? oldJson[key] : undefined;
      const newVal = hasNew ? newJson[key] : undefined;

      if (hasOld && !hasNew) {
        result.push({ key, oldVal, newVal, status: "removed" });
      } else if (!hasOld && hasNew) {
        result.push({ key, oldVal, newVal, status: "added" });
      } else {
        const oldStr = typeof oldVal === "object" ? JSON.stringify(oldVal) : String(oldVal);
        const newStr = typeof newVal === "object" ? JSON.stringify(newVal) : String(newVal);
        if (oldStr !== newStr) {
          result.push({ key, oldVal, newVal, status: "modified" });
        } else {
          result.push({ key, oldVal, newVal, status: "unchanged" });
        }
      }
    });

    return result.sort((a, b) => {
      if (a.status === "unchanged" && b.status !== "unchanged") return 1;
      if (a.status !== "unchanged" && b.status === "unchanged") return -1;
      return a.key.localeCompare(b.key);
    });
  };

  const diffItems = getDiffProperties().filter(
    (item) => !showChangesOnly || item.status !== "unchanged"
  );

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

  const formatValText = (val: any) => {
    if (val === null || val === undefined) return "—";
    if (val === "") return '"" (Trống)';
    if (typeof val === "object") return JSON.stringify(val, null, 2);
    let str = String(val);
    if (typeof val === "string" && (str.startsWith('"') || str.startsWith('{'))) {
      try {
        let parsed = JSON.parse(str);
        if (typeof parsed === "string") {
          try {
            parsed = JSON.parse(parsed);
          } catch {}
        }
        if (typeof parsed === "object" && parsed !== null) {
          return JSON.stringify(parsed, null, 2);
        }
        return String(parsed);
      } catch {}
    }
    return str;
  };

  const hasChanges = (currentLog.oldValue !== null && currentLog.oldValue !== undefined && currentLog.oldValue !== "" && currentLog.oldValue !== "null") ||
                     (currentLog.newValue !== null && currentLog.newValue !== undefined && currentLog.newValue !== "" && currentLog.newValue !== "null");

  const copyToClipboard = (text: string, type: "ip" | "ua") => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    if (type === "ip") {
      setCopiedIp(true);
      setTimeout(() => setCopiedIp(false), 2000);
    } else {
      setCopiedUa(true);
      setTimeout(() => setCopiedUa(false), 2000);
    }
  };

  const renderAffectedObject = () => {
    const entityType = currentLog.entityType || "N/A";
    const entityId = currentLog.entityId || "—";
    const action = currentLog.action || "";

    if (action === "TRANSFER_DEPARTMENT") {
      return (
        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between gap-2 border-b border-border/20 pb-2">
            <span className="text-muted-foreground font-semibold">Nhân viên bị tác động:</span>
            <span className="font-bold text-foreground font-mono bg-muted/60 px-2 py-0.5 rounded">ID: #{entityId}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Phòng ban cũ (Trước):</span>
            <span className="font-bold text-destructive font-mono bg-destructive/10 border border-destructive/20 px-2.5 py-0.5 rounded">ID: #{currentLog.oldValue || "—"}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Phòng ban mới (Sau):</span>
            <span className="font-bold text-emerald-600 font-mono bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded">ID: #{currentLog.newValue || "—"}</span>
          </div>
        </div>
      );
    }

    if (action === "GRANT_ROLE" || action === "REVOKE_ROLE") {
      return (
        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between gap-2 border-b border-border/20 pb-2">
            <span className="text-muted-foreground font-semibold">Tài khoản được gán/gỡ:</span>
            <span className="font-bold text-foreground font-mono bg-muted/60 px-2 py-0.5 rounded">ID: #{entityId}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Vai trò tác động:</span>
            <span className="font-bold text-primary font-mono uppercase bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded">
              {action === "GRANT_ROLE" ? `Cấp: ${currentLog.newValue || "—"}` : `Thu hồi: ${currentLog.oldValue || "—"}`}
            </span>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-3 text-xs">
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground font-semibold">Loại thực thể:</span>
          <span className="font-bold text-primary uppercase font-mono text-[11px] bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded">
            {entityType}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground font-semibold">ID Thực thể:</span>
          <span className="font-bold text-foreground font-mono bg-muted/60 px-2 py-0.5 rounded">#{entityId}</span>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) onClose(); }}>
      <DialogContent className="max-w-5xl w-[94vw] max-h-[92vh] flex flex-col p-0 overflow-hidden rounded-2xl bg-card border border-border/40 shadow-2xl backdrop-blur-xs">
        
        {/* FIXED HEADER */}
        <DialogHeader className="p-6 bg-linear-to-br from-primary/10 via-card to-card border-b border-border/40 shrink-0 relative">
          <span className="sr-only" tabIndex={-1} autoFocus />
          {loadingDetail && (
            <div className="absolute right-14 top-6 flex items-center gap-1.5 text-xs text-muted-foreground animate-pulse">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              <span>Đang làm mới dữ liệu...</span>
            </div>
          )}

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-primary/20 text-primary font-black text-2xl flex items-center justify-center border-2 border-primary/30 shrink-0">
                <History className="h-8 w-8" />
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <DialogTitle className="text-2xl font-black tracking-tight text-foreground">
                    Nhật ký Hoạt động #{currentLog.id}
                  </DialogTitle>
                  <span className={`px-2.5 py-0.5 rounded-lg font-mono text-xs font-bold border uppercase tracking-wider ${getActionColor(currentLog.action)}`}>
                    {currentLog.action}
                  </span>
                  <Badge variant="outline" className="font-mono text-xs font-bold border-border/40 bg-muted/40">
                    {currentLog.entityType || "SYSTEM"} #{currentLog.entityId || "N/A"}
                  </Badge>
                </div>

                <DialogDescription className="text-xs text-muted-foreground mt-1 flex items-center gap-4 flex-wrap">
                  <span>Thực hiện: <strong className="text-foreground">{currentLog.userFullName || "Hệ thống / Guest"}</strong></span>
                  <span>Thời gian: <strong className="text-foreground">{formatDate(currentLog.occurredAt)}</strong></span>
                  <span>IP: <strong className="text-primary font-mono">{currentLog.ipAddress || "—"}</strong></span>
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant="outline"
                onClick={onClose}
                className="font-bold text-xs gap-1.5 rounded-xl cursor-pointer"
              >
                Đóng
              </Button>
            </div>
          </div>
        </DialogHeader>

        {errorDetail && (
          <div className="mx-6 mt-3 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorDetail} (Sử dụng dữ liệu tạm thời từ danh sách)</span>
          </div>
        )}

        {/* SINGLE SCROLLABLE BODY CONTAINING ALL SECTIONS */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6" ref={contentRef}>
          
          {/* SECTION 1: ACTOR & TARGET ENTITY CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Card 1: Actor Profile */}
            <div className="p-5 rounded-2xl bg-muted/20 border border-border/30 space-y-4">
              <h4 className="text-xs font-extrabold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                <span>Tài khoản thực hiện (Actor)</span>
              </h4>
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14 border border-border/40 shrink-0">
                  <AvatarImage src={currentLog.userAvatarUrl} alt={currentLog.userFullName} />
                  <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                    {getInitials(currentLog.userFullName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 space-y-1">
                  <p className="font-extrabold text-sm text-foreground truncate">{currentLog.userFullName || "Hệ thống / Guest"}</p>
                  <p className="text-xs text-muted-foreground truncate">{currentLog.userEmail || "N/A"}</p>
                  <Badge variant="outline" className="font-mono text-[10px] text-muted-foreground mt-1">
                    User ID: {currentLog.userId || "N/A"}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Card 2: Affected Entity */}
            <div className="p-5 rounded-2xl bg-muted/20 border border-border/30 space-y-4">
              <h4 className="text-xs font-extrabold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Info className="h-4 w-4 text-primary" />
                <span>Đối tượng bị tác động (Target Entity)</span>
              </h4>
              {renderAffectedObject()}
            </div>
          </div>
          
          {/* SECTION 3: NETWORK & DEVICE ACCESS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* IP Address Card */}
            <div className="p-5 rounded-2xl bg-muted/20 border border-border/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Globe className="h-4 w-4 text-primary" />
                  <span>Địa chỉ IP</span>
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyToClipboard(currentLog.ipAddress, "ip")}
                  className="h-7 px-2 text-[10px] font-bold text-primary hover:bg-primary/10 gap-1 cursor-pointer"
                >
                  {copiedIp ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                  <span>{copiedIp ? "Đã sao chép" : "Sao chép"}</span>
                </Button>
              </div>
              <div className="font-mono text-base font-extrabold text-foreground bg-background p-3 rounded-xl border border-border/20 select-all">
                {currentLog.ipAddress || "—"}
              </div>
            </div>

            {/* User Agent Card */}
            <div className="p-5 rounded-2xl bg-muted/20 border border-border/30 space-y-3 md:col-span-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Laptop className="h-4 w-4 text-primary" />
                  <span>Trình duyệt & Thiết bị (User Agent)</span>
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyToClipboard(currentLog.userAgent, "ua")}
                  className="h-7 px-2 text-[10px] font-bold text-primary hover:bg-primary/10 gap-1 cursor-pointer"
                >
                  {copiedUa ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                  <span>{copiedUa ? "Đã sao chép" : "Sao chép User Agent"}</span>
                </Button>
              </div>
              <div className="font-mono text-xs text-foreground bg-background p-3.5 rounded-xl border border-border/20 break-all select-all max-h-36 overflow-y-auto leading-relaxed">
                {currentLog.userAgent || "—"}
              </div>
            </div>
          </div>

          {/* SECTION 2: JSON DIFF / VALUES COMPARISON */}
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-muted/20 border border-border/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="text-xs font-extrabold text-foreground uppercase flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <span>Giá trị thay đổi (JSON Diff)</span>
                  {isJsonDiff && (
                    <Badge variant="outline" className="text-[10px] font-bold border-primary/30 text-primary bg-primary/10">
                      JSON Diff Mode
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {hasChanges ? "Ghi nhận có sự thay đổi thuộc tính cấu hình." : "Không phát sinh thay đổi dữ liệu thuộc tính."}
                </div>
              </div>

              {isJsonDiff && hasChanges && (
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors select-none bg-background px-3 py-1.5 rounded-xl border border-border/40">
                  <Checkbox
                    checked={showChangesOnly}
                    onCheckedChange={(checked) => setShowChangesOnly(!!checked)}
                  />
                  <span>Chỉ hiển thị các trường thay đổi</span>
                </label>
              )}
            </div>

            {!hasChanges ? (
              <div className="min-h-30 flex flex-col items-center justify-center text-center text-xs text-muted-foreground gap-2 py-6 bg-muted/10 rounded-2xl border border-dashed border-border/40">
                <Info className="h-6 w-6 text-muted-foreground/50 shrink-0" />
                <div>
                  <p className="font-bold text-foreground text-xs">Không có dữ liệu thay đổi cấu hình</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 max-w-md">Hoạt động này không ghi nhận thay đổi giá trị thuộc tính (ví dụ: đăng nhập, đăng xuất hoặc hành động chỉ đọc).</p>
                </div>
              </div>
            ) : isJsonDiff ? (
              diffItems.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground bg-muted/10 rounded-xl border border-border/30">
                  Không có thay đổi dữ liệu nào (Giá trị trước và sau hoàn toàn trùng khớp).
                </div>
              ) : (
                <div className="border border-border/30 rounded-xl overflow-hidden shadow-xs">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="bg-muted/40 border-b border-border/30 text-muted-foreground uppercase font-bold text-[10px]">
                        <th className="py-3 px-4 w-1/4 border-r border-border/20">Thuộc tính</th>
                        <th className="py-3 px-4 w-3/8 border-r border-border/20">Giá trị cũ (Trước)</th>
                        <th className="py-3 px-4 w-3/8">Giá trị mới (Sau)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/20">
                      {diffItems.map((item) => {
                        const getRowBg = () => {
                          if (item.status === "added") return "bg-emerald-500/5 text-emerald-800 dark:text-emerald-300";
                          if (item.status === "removed") return "bg-rose-500/5 text-rose-800 dark:text-rose-300";
                          if (item.status === "modified") return "bg-blue-500/5";
                          return "hover:bg-muted/10";
                        };

                        return (
                          <tr key={item.key} className={`${getRowBg()} transition-colors`}>
                            <td className="py-3 px-4 font-mono font-bold select-all align-top border-r border-border/20">
                              <span className="flex items-center gap-1.5">
                                {item.status === "added" && <Plus className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
                                {item.status === "removed" && <Minus className="h-3.5 w-3.5 text-rose-500 shrink-0" />}
                                {item.status === "modified" && <Edit className="h-3.5 w-3.5 text-blue-500 shrink-0" />}
                                {item.key}
                              </span>
                            </td>
                            <td className={`py-3 px-4 font-mono whitespace-pre-wrap align-top border-r border-border/20 ${item.status === "removed" || item.status === "modified" ? "text-rose-500 line-through decoration-rose-500/50" : "text-muted-foreground"}`}>
                              {formatValText(item.oldVal)}
                            </td>
                            <td className={`py-3 px-4 font-mono whitespace-pre-wrap align-top ${item.status === "added" || item.status === "modified" ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-muted-foreground"}`}>
                              {formatValText(item.newVal)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )
            ) : (
              /* Non-JSON format raw values */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Giá trị cũ (Raw string):</span>
                  <pre className="p-4 bg-muted/30 border border-border/30 rounded-xl text-xs font-mono whitespace-pre-wrap max-h-60 overflow-y-auto w-full">
                    {formatValText(currentLog.oldValue)}
                  </pre>
                </div>
                <div className="space-y-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Giá trị mới (Raw string):</span>
                  <pre className="p-4 bg-emerald-500/5 border border-emerald-500/10 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-mono whitespace-pre-wrap max-h-60 overflow-y-auto w-full">
                    {formatValText(currentLog.newValue)}
                  </pre>
                </div>
              </div>
            )}
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
};
