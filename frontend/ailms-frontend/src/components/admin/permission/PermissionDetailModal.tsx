import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileKey,
  Shield,
  Clock,
  Layers,
  AlertCircle,
  History,
  Loader2,
  Trash2,
  Plus,
} from "lucide-react";
import { permissionApi } from "@/api/permissions/permissionApi";
import { roleApi } from "@/api/roles/roleApi";
import { userApi } from "@/api/users/userApi";
import { auditLogApi, type AuditLogResponse } from "@/api/audit/auditLogApi";
import type { PermissionResponse, RoleResponse } from "@/types/admin";
import { formatDateDisplay } from "@/components/ui/DatePickerInput";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface PermissionDetailModalProps {
  open: boolean;
  onClose: () => void;
  permission: PermissionResponse | null;
  onPermissionUpdated?: () => void;
}

export const PermissionDetailModal: React.FC<PermissionDetailModalProps> = ({
  open,
  onClose,
  permission,
  onPermissionUpdated
}) => {

  const [roles, setRoles] = useState<RoleResponse[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [removingRoleId, setRemovingRoleId] = useState<string | null>(null);

  // User Map for resolving CreatedBy / UpdatedBy IDs to Email/Name
  const [userMap, setUserMap] = useState<Record<string, { name: string; email: string }>>({});

  // Assign Role State
  const [allRoles, setAllRoles] = useState<RoleResponse[]>([]);
  const [selectedAssignRoleId, setSelectedAssignRoleId] = useState<string>("");
  const [showAssignSelect, setShowAssignSelect] = useState<boolean>(false);
  const [assigningRole, setAssigningRole] = useState<boolean>(false);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditLogResponse[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const fetchRoles = () => {
    if (permission) {
      setLoadingRoles(true);
      permissionApi.getRolesByPermissionId(String(permission.id)).then(data => {
        if (data) setRoles(data);
        else setRoles([]);
      }).catch((err) => {
        console.error("Lỗi lấy danh sách role của permission:", err);
        setRoles([]);
      }).finally(() => setLoadingRoles(false));
    }
  };

  const fetchAuditLogs = () => {
    if (permission) {
      setLoadingLogs(true);
      auditLogApi.getAuditLogsByEntity("PERMISSION", permission.id).then(data => {
        if (data?.content) setAuditLogs(data.content);
        else if (Array.isArray(data)) setAuditLogs(data);
        else setAuditLogs([]);
      }).catch(err => {
        console.error("Lỗi lấy audit log permission:", err);
        setAuditLogs([]);
      }).finally(() => setLoadingLogs(false));
    }
  };

  useEffect(() => {
    if (permission && open) {
      fetchRoles();
      fetchAuditLogs();
      roleApi.getAllRoles().then(res => {
        if (res?.data?.data) setAllRoles(res.data.data);
        else if (Array.isArray(res?.data)) setAllRoles(res.data as any);
      }).catch(err => console.error("Lỗi lấy danh sách tất cả role:", err));

      // Resolve CreatedBy / UpdatedBy Users if ID
      const idsToFetch = [permission.createdBy, permission.updatedBy].filter(Boolean) as string[];
      idsToFetch.forEach(idStr => {
        const id = String(idStr);
        if (id && !id.includes("@") && !userMap[id]) {
          userApi.getUserById(id).then(res => {
            if (res?.data?.data) {
              const u = res.data.data;
              setUserMap(prev => ({
                ...prev,
                [id]: { name: u.fullName || u.username, email: u.email }
              }));
            }
          }).catch(() => null);
        }
      });
    }
  }, [permission, open]);

  const formatUserDisplay = (userVal?: string | null) => {
    if (!userVal) return "System (Hệ thống)";
    const str = String(userVal);
    if (str.includes("@")) return str;
    if (userMap[str]) {
      const u = userMap[str];
      return u.email ? `${u.name ? `${u.name} — ` : ""}${u.email}` : (u.name || str);
    }
    return str;
  };

  const [removeConfirmRole, setRemoveConfirmRole] = useState<{ id: string; name: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");

  const handleRemoveRole = (roleId: string, roleName: string) => {
    setRemoveConfirmRole({ id: roleId, name: roleName });
  };

  const confirmRemoveRoleAction = async () => {
    if (!removeConfirmRole || !permission) return;
    setRemovingRoleId(removeConfirmRole.id);
    try {
      await permissionApi.removeRoleFromPermission(String(permission.id), removeConfirmRole.id);
      fetchRoles();
      fetchAuditLogs();
      if (onPermissionUpdated) onPermissionUpdated();
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || err.message || "Không thể xóa Role khỏi Permission này");
    } finally {
      setRemovingRoleId(null);
      setRemoveConfirmRole(null);
    }
  };

  const handleAssignRole = async (roleId: string) => {
    if (!roleId || roleId === "_empty" || !permission) return;
    setAssigningRole(true);
    setErrorMsg("");
    try {
      await permissionApi.assignRoleToPermission(String(permission.id), roleId);
      setSelectedAssignRoleId("");
      setShowAssignSelect(false);
      fetchRoles();
      fetchAuditLogs();
      if (onPermissionUpdated) onPermissionUpdated();
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || err.message || "Lỗi gán Role cho Permission");
    } finally {
      setAssigningRole(false);
    }
  };

  const availableRoles = allRoles.filter(r => !roles.some(assigned => String(assigned.id) === String(r.id)));

  if (!permission) return null;
  const isOrphan = (permission.roleCount || roles.length) === 0;

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) onClose(); }}>
      <DialogContent className="max-w-4xl w-[92vw] max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl bg-card border border-border/40 shadow-2xl backdrop-blur-xs">
        
        {/* FIXED HEADER */}
        <DialogHeader className="p-6 bg-linear-to-br from-primary/10 via-card to-card border-b border-border/40 shrink-0">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-primary/20 text-primary font-black text-xl flex items-center justify-center border-2 border-primary/30 shrink-0">
              <FileKey className="h-7 w-7" />
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <DialogTitle className="text-2xl font-black tracking-tight text-foreground">
                  {permission.name || permission.code}
                </DialogTitle>
                <span className="font-mono text-xs font-extrabold px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
                  {permission.code}
                </span>
                {!isOrphan ? (
                  <Badge className="bg-emerald-600 text-white font-bold text-xs">
                    Đang được gán ({roles.length} Roles)
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="font-bold text-xs">
                    Cảnh báo: Permission Mồ côi (No Role)
                  </Badge>
                )}
              </div>

              <DialogDescription className="text-xs text-muted-foreground mt-1 flex items-center gap-4">
                <span>Entity: <strong className="text-foreground font-mono uppercase">{permission.entity}</strong></span>
                <span>Action: <strong className="text-primary font-mono uppercase">{permission.action}</strong></span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* CONTENT BODY */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          
          {/* Section 1: Thông tin Kỹ thuật Permission */}
          <Card className="border-border shadow-xs">
            <CardHeader className="py-3 bg-muted/20 border-b border-border/30">
              <CardTitle className="text-xs font-extrabold text-foreground flex items-center gap-1.5 uppercase">
                <Layers className="h-4 w-4 text-primary" /> Thông tin Kỹ thuật (Technical Spec)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-muted-foreground font-bold block">ID Hệ thống (ID):</span>
                <span className="font-mono font-bold text-foreground text-sm">{permission.id}</span>
              </div>
              <div>
                <span className="text-muted-foreground font-bold block">Thực thể (Entity):</span>
                <span className="font-mono font-extrabold text-foreground text-sm uppercase">{permission.entity}</span>
              </div>
              <div>
                <span className="text-muted-foreground font-bold block">Hành động (Action):</span>
                <span className="font-mono font-extrabold text-primary text-sm uppercase">{permission.action}</span>
              </div>
              <div>
                <span className="text-muted-foreground font-bold block">Mã Code Duy Nhất:</span>
                <span className="font-mono font-bold text-foreground">{permission.code}</span>
              </div>
              <div>
                <span className="text-muted-foreground font-bold block">Người tạo:</span>
                <span className="font-semibold text-foreground">{formatUserDisplay(permission.createdBy)}</span>
              </div>
              <div>
                <span className="text-muted-foreground font-bold block">Ngày tạo hệ thống:</span>
                <span className="font-mono font-medium text-foreground">{permission.createdAt ? formatDateDisplay(permission.createdAt) : "—"}</span>
              </div>
              <div>
                <span className="text-muted-foreground font-bold block">Thời gian cập nhật:</span>
                <span className="font-mono font-medium text-foreground">{permission.updatedAt ? formatDateDisplay(permission.updatedAt) : "Chưa cập nhật"}</span>
              </div>
              <div>
                <span className="text-muted-foreground font-bold block">Người cập nhật:</span>
                <span className="font-semibold text-foreground">{formatUserDisplay(permission.updatedBy)}</span>
              </div>
              <div className="sm:col-span-3">
                <span className="text-muted-foreground font-bold block">Mô tả chức năng:</span>
                <span className="text-foreground font-medium">{permission.description || "Không có mô tả chi tiết."}</span>
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Bảng danh sách các Role đang sử dụng Permission này */}
          <Card className="border-border shadow-xs">
            <CardHeader className="py-3 bg-muted/20 border-b border-border/30 flex flex-row items-center justify-between gap-2 flex-wrap">
              <CardTitle className="text-xs font-extrabold text-foreground flex items-center gap-1.5 uppercase">
                <Shield className="h-4 w-4 text-purple-600" /> Danh sách Roles đang gán Quyền này ({roles.length})
              </CardTitle>

              <div className="flex items-center gap-2">
                {showAssignSelect ? (
                  <div className="flex items-center gap-2">
                    {assigningRole ? (
                      <div className="flex items-center gap-1 text-xs text-purple-600 font-semibold px-2 py-1">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Đang gán...</span>
                      </div>
                    ) : (
                      <Select value={selectedAssignRoleId} onValueChange={(val) => { setSelectedAssignRoleId(val); handleAssignRole(val); }}>
                        <SelectTrigger className="h-8 w-52 text-xs font-semibold bg-background border-border">
                          <SelectValue placeholder="-- Chọn Role muốn gán --" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableRoles.length === 0 ? (
                            <SelectItem value="_empty" disabled>Tất cả Roles đã được gán</SelectItem>
                          ) : (
                            availableRoles.map(r => (
                              <SelectItem key={r.id} value={String(r.id)}>
                                {r.name} ({r.code})
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => setShowAssignSelect(false)} className="h-8 text-xs cursor-pointer">
                      Hủy
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={() => setShowAssignSelect(true)}
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs font-semibold gap-1.5 text-purple-600 border-purple-600/30 hover:bg-purple-600/10 cursor-pointer rounded-xl"
                  >
                    <Plus className="h-3.5 w-3.5" /> Gán Role mới
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loadingRoles ? (
                <div className="p-8 text-center text-muted-foreground text-xs flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span>Đang tải danh sách vai trò...</span>
                </div>
              ) : roles.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground text-xs space-y-1">
                  <AlertCircle className="h-8 w-8 mx-auto text-amber-500" />
                  <p className="font-bold text-amber-600">Permission Mồ côi (Orphan Permission)</p>
                  <p>Quyền này chưa được gán cho bất kỳ vai trò nào trong hệ thống.</p>
                </div>
              ) : (
                <div className="divide-y divide-border/30">
                  {roles.map(r => (
                    <div key={r.id} className="p-3.5 flex items-center justify-between text-xs hover:bg-muted/20 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-purple-600/10 text-purple-600 font-bold flex items-center justify-center border border-purple-600/20">
                          {r.name ? r.name.charAt(0).toUpperCase() : "R"}
                        </div>
                        <div>
                          <div className="font-bold text-foreground flex items-center gap-2">
                            <span>{r.name}</span>
                            <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-muted font-bold text-muted-foreground">{r.code}</span>
                          </div>
                          <div className="text-[11px] text-muted-foreground">{r.description || "System Role"}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Badge variant={r.isSystem ? "default" : "outline"} className="font-bold text-[10px]">
                          {r.isSystem ? "System" : "Custom"}
                        </Badge>
                        <Button
                          onClick={() => handleRemoveRole(String(r.id), r.name)}
                          disabled={removingRoleId === String(r.id)}
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs text-red-600 hover:bg-red-500/10 gap-1 font-semibold"
                          title="Xóa Quyền này khỏi Role"
                        >
                          {removingRoleId === String(r.id) ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                          <span>Gỡ Role</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section 3: Audit Log */}
          <Card className="border-border shadow-xs">
            <CardHeader className="py-3 bg-muted/20 border-b border-border/30">
              <CardTitle className="text-xs font-extrabold text-foreground flex items-center gap-1.5 uppercase">
                <History className="h-4 w-4 text-emerald-600" /> Audit Log Lịch Sử Thao Tác
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              {loadingLogs ? (
                <div className="flex items-center justify-center gap-2 text-muted-foreground py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                  <span>Đang tải lịch sử thao tác...</span>
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-1 py-4 text-muted-foreground">
                  <Clock className="h-6 w-6 opacity-40 text-primary" />
                  <p>Khởi tạo Permission mã <strong className="text-foreground">{permission.code}</strong> qua hệ thống Migration Seed.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {auditLogs.map((logItem) => (
                    <div key={logItem.id} className="p-2.5 rounded-lg bg-muted/20 border border-border/30 flex flex-col gap-1">
                      <div className="flex items-center justify-between font-semibold">
                        <span className="text-primary uppercase font-mono">{logItem.action}</span>
                        <span className="text-[11px] text-muted-foreground font-mono">{logItem.occurredAt ? formatDateDisplay(logItem.occurredAt) : "N/A"}</span>
                      </div>
                      <div className="text-muted-foreground text-[11px] flex items-center gap-2">
                        <span>Thực hiện bởi: <strong className="text-foreground">{logItem.userFullName || logItem.userEmail || "System"}</strong></span>
                        {logItem.ipAddress && <span>(IP: {logItem.ipAddress})</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </DialogContent>

      <ConfirmDialog
        open={Boolean(removeConfirmRole)}
        onOpenChange={(open) => { if (!open) setRemoveConfirmRole(null); }}
        title="Xác nhận gỡ Quyền khỏi Role"
        description={`Bạn có chắc chắn muốn gỡ quyền "${permission.name}" khỏi Role "${removeConfirmRole?.name}"?`}
        confirmText="Gỡ ngay"
        cancelText="Hủy bỏ"
        onConfirm={confirmRemoveRoleAction}
      />
    </Dialog>
  );
};

