import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  Shield,
  Copy,
  Trash2,
  Edit2,
  Save,
  Users,
  KeyRound,
  History,
  UserX,
  Clock,
  FileText,
  Info,
  Search
} from "lucide-react";
import { formatDateDisplay } from "@/components/ui/DatePickerInput";

import { roleApi } from "@/api/roles/roleApi";
import { permissionApi } from "@/api/permissions/permissionApi";
import { userApi } from "@/api/users/userApi";
import { auditLogApi } from "@/api/audit/auditLogApi";
import type { RoleResponse, PermissionResponse, UserResponse } from "@/types/admin";

interface RoleDetailModalProps {
  open: boolean;
  onClose: () => void;
  role: RoleResponse | null;
  onUpdateRole?: (updated: Partial<RoleResponse>) => void;
  onPermissionUpdated?: () => void;
  onCloneRole?: (role: RoleResponse) => void;
  onDeleteRole?: (roleId: string) => void;
  onShowBanner?: (msg: string, isError?: boolean) => void;
}

export const RoleDetailModal: React.FC<RoleDetailModalProps> = ({
  open,
  onClose,
  role,
  onUpdateRole,
  onPermissionUpdated,
  onCloneRole,
  onDeleteRole,
  onShowBanner
}) => {
  if (!role) return null;

  const [activeTab, setActiveTab] = useState("general");

  // Tab 1 General Inline Edit
  const [editingGeneral, setEditingGeneral] = useState(false);
  const [nameInput, setNameInput] = useState(role.name || "");
  const [codeInput, setCodeInput] = useState(role.code || "");
  const [descriptionInput, setDescriptionInput] = useState(role.description || "");

  // User Map for resolving CreatedBy / UpdatedBy IDs to Email/Name
  const [userMap, setUserMap] = useState<Record<string, { name: string; email: string }>>({});

  // Tab 2 Permissions Matrix & Search
  const [allPermissions, setAllPermissions] = useState<PermissionResponse[]>([]);
  const [assignedPermIds, setAssignedPermIds] = useState<string[]>([]);
  const [initialPermIds, setInitialPermIds] = useState<string[]>([]);
  const [editingPermissions, setEditingPermissions] = useState(false);
  const [savingPerms, setSavingPerms] = useState(false);
  const [permSearchKeyword, setPermSearchKeyword] = useState("");

  // Tab 3 Users & Search
  const [roleUsers, setRoleUsers] = useState<UserResponse[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearchKeyword, setUserSearchKeyword] = useState("");

  // Tab 4 Audit Log
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingAuditLogs, setLoadingAuditLogs] = useState(false);

  useEffect(() => {
    if (role && open) {
      setNameInput(role.name || "");
      setCodeInput(role.code || "");
      setDescriptionInput(role.description || "");
      setEditingPermissions(false);
      setPermSearchKeyword("");
      setUserSearchKeyword("");

      // Resolve CreatedBy / UpdatedBy Users if ID
      const idsToFetch = [role.createdBy, role.updatedBy].filter(Boolean) as string[];
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

      // Fetch all permissions & assigned permissions
      permissionApi.getAllPermissions().then(res => {
        if (res.data.success) setAllPermissions(res.data.data);
      }).catch(() => null);

      roleApi.getPermissionsByRoleId(String(role.id)).then(res => {
        if (res.data.success && res.data.data) {
          const ids = res.data.data.map(p => String(p.id));
          setAssignedPermIds(ids);
          setInitialPermIds(ids);
        }
      }).catch(() => null);

      // Fetch Users using this role
      setLoadingUsers(true);
      roleApi.getUsersByRoleId(String(role.id)).then(res => {
        if (res.data.success && res.data.data) {
          setRoleUsers(res.data.data);
        }
      }).catch(() => null).finally(() => setLoadingUsers(false));

      // Fetch Audit Logs for this Role
      setLoadingAuditLogs(true);
      auditLogApi.getAuditLogsByEntity("ROLE", String(role.id))
        .then(res => {
          const list = res?.content || res?.data?.content || res?.data || res || [];
          setAuditLogs(Array.isArray(list) ? list : []);
        })
        .catch(() => setAuditLogs([]))
        .finally(() => setLoadingAuditLogs(false));
    }
  }, [role, open]);

  const formatUserDisplay = (userVal?: string | null) => {
    if (!userVal) return "Hệ thống (System)";
    const str = String(userVal);
    if (str.includes("@")) return str;
    if (userMap[str]) {
      const u = userMap[str];
      return u.email ? `${u.name ? `${u.name} — ` : ""}${u.email}` : (u.name || str);
    }
    return str;
  };

  const handleSaveGeneral = () => {
    if (onUpdateRole) {
      onUpdateRole({ name: nameInput, description: descriptionInput });
    }
    setEditingGeneral(false);
    if (onShowBanner) onShowBanner("Đã cập nhật thông tin vai trò thành công!");
    if (onPermissionUpdated) onPermissionUpdated();
  };

  const handleTogglePermission = (permId: string) => {
    if (assignedPermIds.includes(permId)) {
      setAssignedPermIds(assignedPermIds.filter(id => id !== permId));
    } else {
      setAssignedPermIds([...assignedPermIds, permId]);
    }
  };

  const handleSavePermissionsDiff = async () => {
    const added = assignedPermIds.filter(id => !initialPermIds.includes(id));
    const removed = initialPermIds.filter(id => !assignedPermIds.includes(id));
    
    setSavingPerms(true);
    try {
      await roleApi.assignPermissions(String(role.id), {
        permissionIds: assignedPermIds
      });
      setInitialPermIds(assignedPermIds);
      setEditingPermissions(false);
      if (onShowBanner) onShowBanner(`Đã lưu phân quyền! (+${added.length} thêm, -${removed.length} gỡ)`);
      if (onPermissionUpdated) onPermissionUpdated();

      // Refresh Audit logs
      auditLogApi.getAuditLogsByEntity("ROLE", String(role.id)).then(res => {
        const list = res?.content || res?.data?.content || res?.data || res || [];
        setAuditLogs(Array.isArray(list) ? list : []);
      }).catch(() => null);
    } catch (err: any) {
      if (onShowBanner) onShowBanner("Lỗi lưu phân quyền vai trò", true);
    } finally {
      setSavingPerms(false);
    }
  };

  const handleRemoveUserFromRole = async (user: UserResponse) => {
    if (!window.confirm(`Bạn có chắc chắn muốn gỡ user ${user.fullName} khỏi vai trò ${role.name}?`)) return;
    try {
      await roleApi.removeUserFromRole(String(role.id), String(user.id));
      setRoleUsers(roleUsers.filter(u => u.id !== user.id));
      if (onShowBanner) onShowBanner(`Đã gỡ ${user.fullName} khỏi vai trò ${role.name}!`);
      if (onPermissionUpdated) onPermissionUpdated();
    } catch (err: any) {
      if (onShowBanner) onShowBanner("Lỗi gỡ người dùng khỏi vai trò", true);
    }
  };

  const handleRemoveAllUsersFromRole = async () => {
    if (roleUsers.length === 0) return;
    if (!window.confirm(`Bạn có chắc chắn muốn gỡ tất cả ${roleUsers.length} người dùng khỏi vai trò ${role.name}?`)) return;
    try {
      await roleApi.removeAllUsersFromRole(String(role.id));
      setRoleUsers([]);
      if (onShowBanner) onShowBanner(`Đã gỡ tất cả người dùng khỏi vai trò ${role.name}!`);
      if (onPermissionUpdated) onPermissionUpdated();
    } catch (err: any) {
      if (onShowBanner) onShowBanner("Lỗi gỡ tất cả người dùng khỏi vai trò", true);
    }
  };

  // Group Permissions by Entity / Module with Search Keyword Filtering
  const groupedPermissions: Record<string, PermissionResponse[]> = {};
  const permKw = permSearchKeyword.trim().toLowerCase();
  allPermissions.forEach(p => {
    const module = p.entity || (p as any).module || p.code.split(":")[0] || "Hệ thống";
    const matchesSearch = !permKw ||
      (p.name && p.name.toLowerCase().includes(permKw)) ||
      (p.code && p.code.toLowerCase().includes(permKw)) ||
      (p.description && p.description.toLowerCase().includes(permKw)) ||
      module.toLowerCase().includes(permKw);

    if (matchesSearch) {
      if (!groupedPermissions[module]) groupedPermissions[module] = [];
      groupedPermissions[module].push(p);
    }
  });

  // Filter Users in Tab 3 by Search Keyword
  const filteredRoleUsers = roleUsers.filter(u => {
    if (!userSearchKeyword.trim()) return true;
    const kw = userSearchKeyword.trim().toLowerCase();
    return (u.fullName && u.fullName.toLowerCase().includes(kw)) ||
           (u.email && u.email.toLowerCase().includes(kw)) ||
           (u.username && u.username.toLowerCase().includes(kw)) ||
           String(u.id).includes(kw);
  });

  const isSystemRole = Boolean(role.isSystem);
  const isUsedByUsers = (role.userCount || roleUsers.length) > 0;
  const canDeleteRole = !isSystemRole && !isUsedByUsers;

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) onClose(); }}>
      <DialogContent className="max-w-6xl w-[94vw] max-h-[94vh] flex flex-col p-0 overflow-hidden rounded-2xl bg-card border border-border/40 shadow-2xl backdrop-blur-xs">
        
        {/* FIXED HEADER (Name, Code, System/Custom Badge, Clone Role button, Delete button) */}
        <DialogHeader className="p-6 bg-linear-to-br from-primary/10 via-card to-card border-b border-border/40 shrink-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-primary/20 text-primary font-black text-2xl flex items-center justify-center border-2 border-primary/30 shrink-0">
                <Shield className="h-8 w-8" />
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <DialogTitle className="text-2xl font-black tracking-tight text-foreground">
                    {role.name}
                  </DialogTitle>
                  <span className="font-mono text-xs font-extrabold px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
                    {role.code}
                  </span>
                  {isSystemRole ? (
                    <Badge className="bg-purple-600 text-white font-bold text-xs">
                      Hệ thống (System)
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="font-bold text-xs border-primary text-primary">
                      Tùy chỉnh (Custom)
                    </Badge>
                  )}
                </div>

                <DialogDescription className="text-xs text-muted-foreground mt-1 flex items-center gap-4">
                  <span>Mô tả: <strong className="text-foreground">{role.description || "Không có mô tả"}</strong></span>
                  <span>Người dùng: <strong className="text-foreground">{roleUsers.length} Users</strong></span>
                  <span>Permissions: <strong className="text-primary">{assignedPermIds.length} Quyền</strong></span>
                </DialogDescription>
              </div>
            </div>

            {/* Quick Action Buttons: Clone Role & Delete */}
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onCloneRole && onCloneRole(role)}
                className="font-bold text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
              >
                <Copy className="h-4 w-4" /> Nhân bản (Clone)
              </Button>

              <Button
                size="sm"
                variant="destructive"
                disabled={!canDeleteRole}
                onClick={() => onDeleteRole && onDeleteRole(String(role.id))}
                className="font-bold text-xs gap-1.5"
                title={!canDeleteRole ? "Không thể xóa Role hệ thống hoặc Role đang có User sử dụng" : "Xóa Role này"}
              >
                <Trash2 className="h-4 w-4" /> Xóa Role
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* 4 TABS NAVIGATION */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <TabsList className="px-6 border-b border-border/30 bg-muted/20 justify-start gap-4 rounded-none h-12">
            <TabsTrigger value="general" className="font-bold text-xs gap-1.5"><FileText className="h-3.5 w-3.5" /> Tab 1 — Thông tin chung</TabsTrigger>
            <TabsTrigger value="permissions" className="font-bold text-xs gap-1.5"><KeyRound className="h-3.5 w-3.5" /> Tab 2 — Permissions (Matrix)</TabsTrigger>
            <TabsTrigger value="users" className="font-bold text-xs gap-1.5"><Users className="h-3.5 w-3.5" /> Tab 3 — Users đang dùng ({roleUsers.length})</TabsTrigger>
            <TabsTrigger value="audit" className="font-bold text-xs gap-1.5"><History className="h-3.5 w-3.5" /> Tab 4 — Audit Log</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* TAB 1: THÔNG TIN CHUNG */}
            <TabsContent value="general" className="mt-0 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-extrabold text-foreground">Chi tiết thông tin Role</h4>
                {!editingGeneral ? (
                  <Button size="sm" variant="outline" onClick={() => setEditingGeneral(true)} className="gap-1 font-bold text-xs">
                    <Edit2 className="h-3.5 w-3.5" /> Chỉnh sửa
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveGeneral} className="gap-1 font-bold text-xs bg-emerald-600 text-white">
                      <Save className="h-3.5 w-3.5" /> Lưu
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingGeneral(false)} className="gap-1 text-xs">Hủy</Button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-bold text-muted-foreground">Mã Role (Code - Cố định)</Label>
                  <Input value={codeInput} disabled className="mt-1 bg-muted/30 font-mono font-bold text-xs text-muted-foreground cursor-not-allowed" />
                  <p className="text-[11px] text-muted-foreground italic mt-0.5">Mã code không thể chỉnh sửa</p>
                </div>

                <div>
                  <Label className="text-xs font-bold text-muted-foreground">Loại Role (is_system_role Readonly)</Label>
                  <div className="mt-1 flex items-center gap-2 h-9 px-3 rounded-md border bg-muted/30">
                    <Checkbox checked={isSystemRole} disabled className="border-border/40" />
                    <span className="text-xs font-bold">{isSystemRole ? "System Role (Không thể xóa)" : "Custom Role"}</span>
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-bold text-muted-foreground">Tên Role</Label>
                  <Input value={nameInput} onChange={e => setNameInput(e.target.value)} disabled={!editingGeneral} className="mt-1 text-xs font-bold" />
                </div>

                <div>
                  <Label className="text-xs font-bold text-muted-foreground">Mô tả chức năng</Label>
                  <Input value={descriptionInput} onChange={e => setDescriptionInput(e.target.value)} disabled={!editingGeneral} className="mt-1 text-xs" />
                </div>

                <div>
                  <Label className="text-xs font-bold text-muted-foreground">Created By (Người tạo)</Label>
                  <Input value={formatUserDisplay(role.createdBy)} disabled className="mt-1 bg-muted/30 text-xs font-semibold text-foreground" />
                </div>

                <div>
                  <Label className="text-xs font-bold text-muted-foreground">Created At (Thời gian tạo)</Label>
                  <Input value={formatDateDisplay(role.createdAt)} disabled className="mt-1 bg-muted/30 text-xs font-mono" />
                </div>

                <div>
                  <Label className="text-xs font-bold text-muted-foreground">Updated By (Người cập nhật)</Label>
                  <Input value={formatUserDisplay(role.updatedBy)} disabled className="mt-1 bg-muted/30 text-xs font-semibold text-foreground" />
                </div>

                <div>
                  <Label className="text-xs font-bold text-muted-foreground">Updated At (Thời gian cập nhật)</Label>
                  <Input value={formatDateDisplay(role.updatedAt)} disabled className="mt-1 bg-muted/30 text-xs font-mono" />
                </div>
              </div>
            </TabsContent>

            {/* TAB 2: PERMISSIONS MATRIX (Grouped by Entity) */}
            <TabsContent value="permissions" className="mt-0 space-y-4">
              
              {/* Card nhỏ hiển thị tổng số permission được gán, Ô tìm kiếm & Nút Save Diff / Chỉnh sửa */}
              <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-extrabold text-primary uppercase flex items-center gap-2">
                    <span>Tổng số Permissions được gán</span>
                    {!editingPermissions && (
                      <Badge variant="outline" className="text-[10px] font-bold border-amber-500/40 text-amber-600 bg-amber-500/10">
                        Chế độ xem (Readonly)
                      </Badge>
                    )}
                  </div>
                  <div className="text-2xl font-black text-primary mt-0.5">
                    {assignedPermIds.length} / {allPermissions.length || 0} Quyền
                  </div>
                </div>

                {/* Ô tìm kiếm Permission */}
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={permSearchKeyword}
                    onChange={(e) => setPermSearchKeyword(e.target.value)}
                    placeholder="Tìm kiếm permission theo mã, tên, module..."
                    className="pl-9 h-9 text-xs rounded-xl bg-background border-primary/30"
                  />
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  {!editingPermissions ? (
                    <Button
                      onClick={() => setEditingPermissions(true)}
                      size="sm"
                      variant="outline"
                      className="font-bold text-xs gap-1.5 border-primary/40 text-primary hover:bg-primary/10 rounded-xl shadow-xs cursor-pointer"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      <span>Chỉnh sửa phân quyền</span>
                    </Button>
                  ) : (
                    <>
                      {/* Checkbox chọn tất cả hệ thống */}
                      <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-background border border-primary/30 hover:bg-muted cursor-pointer text-xs font-bold text-foreground shadow-xs">
                        <Checkbox
                          checked={allPermissions.length > 0 && assignedPermIds.length === allPermissions.length}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setAssignedPermIds(allPermissions.map(p => String(p.id)));
                            } else {
                              setAssignedPermIds([]);
                            }
                          }}
                          className="border-primary"
                        />
                        <span>Chọn tất cả Quyền ({allPermissions.length})</span>
                      </label>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setAssignedPermIds(initialPermIds);
                          setEditingPermissions(false);
                        }}
                        className="font-bold text-xs gap-1 rounded-xl cursor-pointer"
                      >
                        Hủy
                      </Button>

                      <Button
                        onClick={handleSavePermissionsDiff}
                        disabled={savingPerms}
                        className="font-bold text-xs gap-1.5 bg-primary text-primary-foreground shrink-0 rounded-xl shadow-xs cursor-pointer"
                      >
                        <Save className="h-4 w-4" />
                        <span>{savingPerms ? "Đang lưu..." : "Lưu Phân Quyền (Save Diff)"}</span>
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Readonly Alert Banner when not editing */}
              {!editingPermissions && (
                <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-muted/40 border border-border/40 text-muted-foreground text-xs font-semibold">
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-primary shrink-0" />
                    <span>Đang ở chế độ xem. Bấm nút <strong>Chỉnh sửa phân quyền</strong> phía trên để chọn/bỏ chọn các quyền.</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground italic">Rê chuột vào ô quyền để xem mô tả</span>
                </div>
              )}

              {/* Ma trận Permissions */}
              <div className="space-y-4 pt-2">
                {Object.keys(groupedPermissions).length === 0 ? (
                  <div className="space-y-3">
                    {["User Management", "Student Profile", "Employee & HR", "Course & Class", "System Settings"].map(mod => (
                      <Card key={mod} className="border-border shadow-xs">
                        <CardHeader className="py-2.5 bg-muted/20 border-b border-border/30">
                          <CardTitle className="text-xs font-extrabold text-foreground flex items-center justify-between">
                            <span>Phân quyền Module: {mod}</span>
                            <span className="text-[10px] text-muted-foreground">4 Quyền khả dụng</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {["VIEW", "CREATE", "EDIT", "DELETE"].map(action => (
                            <label key={action} className="flex items-center gap-2 p-2 rounded-lg border bg-background hover:bg-muted/20 cursor-pointer text-xs font-bold">
                              <Checkbox checked={true} className="border-primary" />
                              <span>{action}</span>
                            </label>
                          ))}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  Object.entries(groupedPermissions).map(([module, perms]) => {
                    const modulePermIds = perms.map(p => String(p.id));
                    const isAllModuleChecked = modulePermIds.length > 0 && modulePermIds.every(id => assignedPermIds.includes(id));
                    const selectedInModuleCount = perms.filter(p => assignedPermIds.includes(String(p.id))).length;

                    const handleToggleModule = (checked: boolean) => {
                      if (checked) {
                        setAssignedPermIds(prev => Array.from(new Set([...prev, ...modulePermIds])));
                      } else {
                        setAssignedPermIds(prev => prev.filter(id => !modulePermIds.includes(id)));
                      }
                    };

                    return (
                      <Card key={module} className="border-border shadow-xs">
                        <CardHeader className="py-2.5 bg-muted/20 border-b border-border/30">
                          <CardTitle className="text-xs font-extrabold text-foreground flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={isAllModuleChecked}
                                disabled={!editingPermissions}
                                onCheckedChange={(checked) => {
                                  if (editingPermissions) handleToggleModule(!!checked);
                                }}
                                className="border-primary disabled:opacity-40"
                              />
                              <span>Module: <strong className="text-primary font-mono uppercase">{module}</strong></span>
                            </div>
                            <span className="text-[11px] font-semibold text-muted-foreground">
                              Đã chọn: <strong className="text-foreground font-mono">{selectedInModuleCount}</strong> / {perms.length} Quyền
                            </span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-3">
                          {perms.map(p => {
                            const isChecked = assignedPermIds.includes(String(p.id));
                            return (
                              <div
                                key={p.id}
                                title={p.description ? `Mô tả: ${p.description}` : `Mã: ${p.code}`}
                                className={cn(
                                  "relative group p-2.5 rounded-xl border transition-all text-xs font-bold select-none",
                                  !editingPermissions
                                    ? "bg-muted/10 border-border/30 opacity-90 cursor-default"
                                    : "bg-background border-border/60 hover:border-primary/40 hover:bg-primary/5 cursor-pointer"
                                )}
                                onClick={() => {
                                  if (editingPermissions) handleTogglePermission(String(p.id));
                                }}
                              >
                                <div className="flex items-center gap-2">
                                  <Checkbox
                                    checked={isChecked}
                                    disabled={!editingPermissions}
                                    onCheckedChange={() => {
                                      if (editingPermissions) handleTogglePermission(String(p.id));
                                    }}
                                    className="border-primary disabled:opacity-50"
                                  />
                                  <div className="truncate min-w-0 flex-1">
                                    <div className="font-extrabold text-foreground truncate">{p.name || p.code}</div>
                                    <div className="text-[10px] text-muted-foreground font-mono truncate">{p.code}</div>
                                  </div>
                                </div>

                                {/* Dynamic Hover Tooltip Preview displaying Permission Description */}
                                <div className="absolute left-1/2 -top-10 -translate-x-1/2 hidden group-hover:flex items-center gap-1.5 bg-slate-900 text-white text-[11px] font-medium px-3 py-1.5 rounded-xl shadow-xl z-50 pointer-events-none whitespace-nowrap animate-in fade-in-50 duration-150 border border-slate-700">
                                  <Info className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                                  <span>{p.description || `Quyền ${p.name || p.code} (${p.action} trên ${p.entity})`}</span>
                                </div>
                              </div>
                            );
                          })}
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </TabsContent>

            {/* TAB 3: USERS ĐANG DÙNG ROLE NÀY */}
            <TabsContent value="users" className="mt-0 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={userSearchKeyword}
                    onChange={(e) => setUserSearchKeyword(e.target.value)}
                    placeholder="Tìm kiếm người dùng theo tên, email, ID..."
                    className="pl-9 h-9 text-xs rounded-xl"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs font-bold px-3 py-1.5 rounded-xl">
                    {filteredRoleUsers.length} / {roleUsers.length} Users
                  </Badge>

                  {roleUsers.length > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleRemoveAllUsersFromRole}
                      className="text-xs font-bold text-red-600 hover:bg-red-500/10 border-red-500/30 gap-1.5 rounded-xl cursor-pointer"
                    >
                      <UserX className="h-4 w-4" />
                      <span>Gỡ tất cả người dùng khỏi Role</span>
                    </Button>
                  )}
                </div>
              </div>

              {filteredRoleUsers.length === 0 ? (
                <Card className="border-border shadow-xs p-8 text-center text-muted-foreground text-xs space-y-2">
                  <UserX className="h-10 w-10 mx-auto text-muted-foreground/40" />
                  <p className="font-bold">
                    {userSearchKeyword.trim()
                      ? `Không tìm thấy người dùng nào phù hợp với "${userSearchKeyword}".`
                      : "Hiện không có người dùng nào đang được gán Role này."}
                  </p>
                  <p className="text-[11px]">Role thừa có thể cân nhắc xóa để dọn dẹp hệ thống.</p>
                </Card>
              ) : (
                <div className="space-y-2 max-h-112.5 overflow-y-auto pr-1">
                  {filteredRoleUsers.map(u => (
                    <div key={u.id} className="p-3 rounded-xl border border-border/40 bg-card flex items-center justify-between gap-4 text-xs shadow-xs hover:border-primary/30 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center border border-primary/20 shrink-0">
                          {u.fullName ? u.fullName.charAt(0).toUpperCase() : "U"}
                        </div>
                        <div>
                          <div className="font-bold text-foreground">{u.fullName}</div>
                          <div className="text-[11px] text-muted-foreground">{u.email} &bull; <span className="font-mono text-primary font-bold">ID: {u.id}</span></div>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveUserFromRole(u)}
                        className="text-xs font-bold text-red-600 hover:bg-red-500/10 gap-1 cursor-pointer"
                      >
                        <UserX className="h-3.5 w-3.5" /> Gỡ khỏi Role
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* TAB 4: AUDIT LOG */}
            <TabsContent value="audit" className="mt-0 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-extrabold text-foreground flex items-center gap-2">
                  <History className="h-4 w-4 text-primary" />
                  <span>Lịch sử Thay đổi & Audit Log trên Role {role.name}</span>
                </h4>
                <Badge variant="outline" className="font-mono text-xs font-bold">
                  {auditLogs.length} Bản ghi
                </Badge>
              </div>
              
              {loadingAuditLogs ? (
                <div className="p-8 text-center text-xs font-bold text-muted-foreground">Đang tải nhật ký thay đổi...</div>
              ) : auditLogs.length === 0 ? (
                <Card className="border-border shadow-xs p-8 text-center text-muted-foreground text-xs space-y-2">
                  <Clock className="h-10 w-10 mx-auto text-muted-foreground/40" />
                  <p className="font-bold">Chưa có nhật ký Audit Log nào ghi nhận cho Role này.</p>
                </Card>
              ) : (
                <div className="space-y-3 max-h-112.5 overflow-y-auto pr-1">
                  {auditLogs.map((log: any) => (
                    <div key={log.id || Math.random()} className="p-3.5 rounded-xl border border-border/40 bg-card flex items-start gap-3 text-xs shadow-xs hover:border-primary/30 transition-all">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0 mt-0.5">
                        <Clock className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="font-extrabold text-foreground flex items-center gap-2">
                            <span>Thao tác: <strong className="text-primary">{
                              log.action === "UPDATE_PERMISSIONS" ? "Cập nhật danh sách Quyền" :
                              log.action === "UNASSIGN_ALL_PERMISSIONS" ? "Gỡ tất cả Quyền khỏi Role" :
                              log.action === "UNASSIGN_PERMISSION" ? "Gỡ Quyền khỏi Role" :
                              log.action === "ASSIGN_PERMISSION" ? "Gán Quyền vào Role" :
                              log.action === "REMOVE_USER_ROLE" ? "Gỡ Người dùng khỏi Role" :
                              log.action === "REMOVE_ALL_USERS" ? "Gỡ tất cả Người dùng khỏi Role" :
                              log.action === "CREATE" ? "Khởi tạo Role" :
                              log.action === "UPDATE" ? "Cập nhật Thông tin Role" :
                              (log.action || "THAY ĐỔI")
                            }</strong></span>
                            <Badge variant="outline" className="text-[10px] font-mono">
                              {log.action} &bull; #{log.entityId || role.id}
                            </Badge>
                          </div>
                          <div className="text-[11px] text-muted-foreground font-mono">
                            {log.occurredAt ? formatDateDisplay(log.occurredAt) : "Mới đây"}
                          </div>
                        </div>

                        <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-3 flex-wrap">
                          <span>Người thực hiện: <strong className="text-foreground">{log.userFullName || log.userEmail || `User #${log.userId || "System"}`}</strong></span>
                          {log.ipAddress && <span>IP: <code className="font-mono text-[10px]">{log.ipAddress}</code></span>}
                        </div>

                        {(log.oldValue || log.newValue) && (
                          <div className="mt-2 p-2 rounded-lg bg-muted/30 border border-border/20 text-[11px] font-mono space-y-1 overflow-x-auto">
                            {log.oldValue && <div className="text-red-500/90 truncate">Old: {log.oldValue}</div>}
                            {log.newValue && <div className="text-emerald-600 font-bold truncate">New: {log.newValue}</div>}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
