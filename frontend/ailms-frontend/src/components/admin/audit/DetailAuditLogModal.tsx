import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Laptop,
  Globe,
  Clock,
  User,
  Info,
  Calendar,
  X,
  Plus,
  Minus,
  Edit
} from "lucide-react";
import type { AuditLogResponse } from "@/api/audit/auditLogApi";

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

  if (!log) return null;

  const tryParseJSON = (str: string | null) => {
    if (!str) return null;
    try {
      const parsed = JSON.parse(str);
      if (typeof parsed === "object" && parsed !== null) {
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  };

  const oldJson = tryParseJSON(log.oldValue);
  const newJson = tryParseJSON(log.newValue);
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

    // Sort by status, put changes on top
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

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) onClose(); }}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto p-6 rounded-2xl bg-card border border-border/40 shadow-2xl">
        <DialogHeader className="border-b border-border/30 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Info className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-foreground">
                Chi tiết Nhật ký Hoạt động
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Xem truy vết chi tiết về thời gian, thiết bị, tài khoản tác động và cấu hình thay đổi.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* LOG METADATA GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4">
          
          {/* Column 1: Actor Profile */}
          <div className="space-y-3 bg-muted/20 p-4 rounded-xl border border-border/30">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Tài khoản thực hiện</h4>
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12 border border-border/40">
                <AvatarImage src={log.userAvatarUrl} alt={log.userFullName} />
                <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                  {getInitials(log.userFullName)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="font-bold text-sm text-foreground truncate">{log.userFullName || "Hệ thống / Guest"}</p>
                <p className="text-xs text-muted-foreground truncate">{log.userEmail || "N/A"}</p>
                <p className="text-[10px] text-muted-foreground font-mono mt-0.5">ID: {log.userId || "N/A"}</p>
              </div>
            </div>
          </div>

          {/* Column 2: Activity Stats */}
          <div className="space-y-3 bg-muted/20 p-4 rounded-xl border border-border/30">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Hành động & Thực thể</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">Hành động:</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wide ${getActionColor(log.action)}`}>
                  {log.action}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="text-muted-foreground">Thực thể (Type):</span>
                <span className="font-bold text-foreground uppercase font-mono">{log.entityType || "N/A"}</span>
              </div>
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="text-muted-foreground">ID Thực thể:</span>
                <span className="font-bold text-foreground font-mono">{log.entityId || "—"}</span>
              </div>
            </div>
          </div>

          {/* Column 3: Security & Client Metadata */}
          <div className="space-y-3 bg-muted/20 p-4 rounded-xl border border-border/30">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Mạng & Thiết bị</h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground shrink-0">Thời gian:</span>
                <span className="font-semibold text-foreground truncate ml-auto">{formatDate(log.occurredAt)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground shrink-0">Địa chỉ IP:</span>
                <span className="font-mono text-foreground font-semibold truncate ml-auto">{log.ipAddress || "—"}</span>
              </div>
              <div className="flex items-center gap-2" title={log.userAgent}>
                <Laptop className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground shrink-0">Trình duyệt:</span>
                <span className="text-foreground truncate ml-auto font-medium max-w-40">{log.userAgent || "—"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* JSON DIFF VIEWER SECTION */}
        <div className="mt-4 border border-border/30 rounded-xl overflow-hidden bg-card">
          <div className="px-4 py-3 bg-muted/20 border-b border-border/30 flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <span>Giá trị thay đổi (JSON Diff)</span>
            </span>

            {isJsonDiff && (
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors select-none">
                <Checkbox
                  checked={showChangesOnly}
                  onCheckedChange={(checked) => setShowChangesOnly(!!checked)}
                />
                <span>Chỉ hiển thị các trường thay đổi</span>
              </label>
            )}
          </div>

          <div className="p-4 overflow-x-auto">
            {isJsonDiff ? (
              diffItems.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  Không có thay đổi dữ liệu nào (Giá trị trước và sau hoàn toàn trùng khớp).
                </div>
              ) : (
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border/40 text-muted-foreground uppercase font-bold text-[10px]">
                      <th className="py-2 px-3 w-1/4">Thuộc tính</th>
                      <th className="py-2 px-3 w-3/8">Giá trị cũ (Trước)</th>
                      <th className="py-2 px-3 w-3/8">Giá trị mới (Sau)</th>
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

                      const formatValText = (val: any) => {
                        if (val === null || val === undefined) return "—";
                        if (typeof val === "object") return JSON.stringify(val);
                        return String(val);
                      };

                      return (
                        <tr key={item.key} className={`${getRowBg()} transition-colors`}>
                          <td className="py-2.5 px-3 font-mono font-bold select-all align-top">
                            <span className="flex items-center gap-1.5">
                              {item.status === "added" && <Plus className="h-3 w-3 text-emerald-500 shrink-0" />}
                              {item.status === "removed" && <Minus className="h-3 w-3 text-rose-500 shrink-0" />}
                              {item.status === "modified" && <Edit className="h-3 w-3 text-blue-500 shrink-0" />}
                              {item.key}
                            </span>
                          </td>
                          <td className={`py-2.5 px-3 font-mono whitespace-pre-wrap align-top ${item.status === "removed" || item.status === "modified" ? "text-rose-500 line-through decoration-rose-500/50" : "text-muted-foreground"}`}>
                            {formatValText(item.oldVal)}
                          </td>
                          <td className={`py-2.5 px-3 font-mono whitespace-pre-wrap align-top ${item.status === "added" || item.status === "modified" ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-muted-foreground"}`}>
                            {formatValText(item.newVal)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )
            ) : (
              /* Non-JSON format raw values */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Giá trị cũ (Raw string):</span>
                  <pre className="p-3 bg-muted/40 border border-border/30 rounded-lg text-xs font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">
                    {log.oldValue || "—"}
                  </pre>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase text-emerald-600">Giá trị mới (Raw string):</span>
                  <pre className="p-3 bg-emerald-500/5 border border-emerald-500/10 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">
                    {log.newValue || "—"}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="border-t border-border/30 pt-4 mt-6">
          <Button onClick={onClose} variant="outline" className="h-9 cursor-pointer rounded-lg px-4 font-semibold text-xs text-muted-foreground hover:text-foreground">
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
