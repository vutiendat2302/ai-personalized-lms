import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { roleApi } from "@/api/roles/roleApi";
import { permissionApi } from "@/api/permissions/permissionApi";
import type { RoleResponse, PermissionResponse } from "@/types/admin";
import {
  Shield,
  Plus,
  Search,
  Trash2,
  Edit,
  Copy,
  CheckCircle2,
  X,
  ArrowLeft,
  Loader2,
  AlertCircle
} from "lucide-react";

export const RoleManagement: React.FC = () => {
  const [roles, setRoles] = useState<RoleResponse[]>([]);
  const [permissions, setPermissions] = useState<PermissionResponse[]>([]);
  const [assignedPermissionIds, setAssignedPermissionIds] = useState<string[]>([]);
  const [searchRole, setSearchRole] = useState("");
  const [successBanner, setSuccessBanner] = useState("");
  const [errorBanner, setErrorBanner] = useState("");

  // Loading
  const [loading, setLoading] = useState(false);

  // Pagination
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  // Modals state
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleResponse | null>(null);

  const [assignPermissionsModalOpen, setAssignPermissionsModalOpen] = useState(false);
  const [assigningRole, setAssigningRole] = useState<RoleResponse | null>(null);

  useEffect(() => {
    fetchPermissions();
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [page]);

  const showBanner = (msg: string, isError = false) => {
    if (isError) {
      setErrorBanner(msg);
      setTimeout(() => setErrorBanner(""), 3000);
    } else {
      setSuccessBanner(msg);
      setTimeout(() => setSuccessBanner(""), 3000);
    }
  };

  const fetchPermissions = async () => {
    try {
      const res = await permissionApi.getAllPermissions();
      if (res.data.success) {
        setPermissions(res.data.data);
      }
    } catch (err: any) {
      console.error("Lỗi lấy danh sách quyền hạn:", err);
    }
  };

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const params: any = {
        page,
        size: 10,
        sort: "id:desc"
      };
      if (searchRole) params.search = searchRole;

      const res = await roleApi.getRoles(params);
      if (res.data.success) {
        // Spring Page response
        const pageData = res.data.data;
        setRoles(pageData.content || []);
        setTotalPages(pageData.totalPages || 0);
        setTotalElements(pageData.totalElements || 0);
      }
    } catch (err: any) {
      showBanner(err.message || "Không thể tải danh sách vai trò", true);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = new FormData(e.target as HTMLFormElement);
    const name = (data.get("name") as string).toUpperCase();
    const description = data.get("description") as string;

    try {
      if (editingRole) {
        const res = await roleApi.updateRole(editingRole.id, { name, description });
        if (res.data.success) {
          showBanner("Cập nhật vai trò thành công!");
          fetchRoles();
        }
      } else {
        const res = await roleApi.createRole({ name, description });
        if (res.data.success) {
          showBanner("Tạo vai trò mới thành công!");
          setPage(0);
          fetchRoles();
        }
      }
      setRoleModalOpen(false);
      setEditingRole(null);
    } catch (err: any) {
      showBanner(err.message || "Lỗi lưu thông tin vai trò", true);
    }
  };

  const handleCloneRole = async (role: RoleResponse) => {
    const newName = prompt(`Nhập tên vai trò mới (bản sao của ${role.name}):`, `${role.name}_CLONE`);
    if (!newName) return;

    try {
      const res = await roleApi.cloneRole(role.id, { name: newName.toUpperCase() });
      if (res.data.success) {
        showBanner(`Nhân bản vai trò ${role.name} thành công!`);
        fetchRoles();
      }
    } catch (err: any) {
      showBanner(err.message || "Lỗi nhân bản vai trò", true);
    }
  };

  const handleDeleteRole = async (id: string, roleName: string) => {
    const role = roles.find(r => r.id === id);
    if (role?.isSystem) {
      alert("Không thể xóa vai trò hệ thống!");
      return;
    }
    if (window.confirm(`Bạn có muốn xóa vai trò ${roleName}?`)) {
      try {
        const res = await roleApi.deleteRole(id);
        if (res.data.success) {
          showBanner("Xóa vai trò thành công!");
          fetchRoles();
        }
      } catch (err: any) {
        showBanner(err.message || "Lỗi xóa vai trò", true);
      }
    }
  };

  const handleOpenAssignModal = async (role: RoleResponse) => {
    setAssigningRole(role);
    setLoading(true);
    try {
      const res = await roleApi.getPermissionsByRoleId(role.id);
      if (res.data.success) {
        // Map permission objects to their IDs
        const ids = res.data.data.map((p) => p.id);
        setAssignedPermissionIds(ids);
      }
      setAssignPermissionsModalOpen(true);
    } catch (err: any) {
      showBanner(err.message || "Không thể lấy thông tin quyền hạn vai trò", true);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignPermissions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningRole) return;
    const data = new FormData(e.target as HTMLFormElement);
    const checkedPerms = data.getAll("assignedPerms").map(p => p as string);

    try {
      const res = await roleApi.assignPermissions(assigningRole.id, { permissionIds: checkedPerms });
      if (res.data.success) {
        showBanner(`Cập nhật quyền hạn cho vai trò ${assigningRole.name} thành công!`);
        fetchRoles();
        setAssignPermissionsModalOpen(false);
        setAssigningRole(null);
      }
    } catch (err: any) {
      showBanner(err.message || "Lỗi cập nhật quyền hạn", true);
    }
  };

  return (
    <div className="mx-auto max-w-none w-full px-6 py-8 lg:px-12 space-y-8 animate-in fade-in-50 duration-300">
      
      {/* Top Banner Messages */}
      {successBanner && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl bg-green-500 text-white px-4 py-3 shadow-xl animate-in slide-in-from-bottom-5 duration-300">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span className="text-sm font-semibold">{successBanner}</span>
        </div>
      )}

      {errorBanner && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl bg-destructive text-white px-4 py-3 shadow-xl animate-in slide-in-from-bottom-5 duration-300">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span className="text-sm font-semibold">{errorBanner}</span>
        </div>
      )}

      {/* Header and Quick Switch Links */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-primary mb-1">
            <Link to="/dashboard" className="flex items-center gap-1 hover:underline">
              <ArrowLeft className="h-3 w-3" />
              <span>Quay lại Dashboard</span>
            </Link>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <span>Quản lý Vai trò (Roles)</span>
          </h1>
        </div>

        {/* Sub Nav Links */}
        <div className="flex gap-2">
          <Link to="/admin/users">
            <Button variant="outline" size="sm" className="h-9 font-bold">
              Người dùng
            </Button>
          </Link>
          <Link to="/admin/roles">
            <Button variant="default" size="sm" className="h-9 font-bold bg-primary text-primary-foreground">
              Vai trò
            </Button>
          </Link>
          <Link to="/admin/permissions">
            <Button variant="outline" size="sm" className="h-9 font-bold">
              Quyền hạn
            </Button>
          </Link>
          <Link to="/admin/courses">
            <Button variant="outline" size="sm" className="h-9 font-bold">
              Khóa học
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Roles Card */}
      <Card className="border-border shadow-sm bg-card">
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-border">
          <div>
            <CardTitle className="text-lg font-bold font-heading">Danh sách vai trò hệ thống</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Định nghĩa chức năng, phân phối quyền hạn thao tác cho giảng viên, trợ giảng và học viên.
            </CardDescription>
          </div>

          <Button
            onClick={() => { setEditingRole(null); setRoleModalOpen(true); }}
            variant="default"
            size="sm"
            className="h-9 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/95"
          >
            <Plus className="h-4 w-4" />
            <span>Thêm vai trò</span>
          </Button>
        </CardHeader>

        {/* Search */}
        <div className="p-4 bg-muted/20 border-b border-border/80 flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Tìm theo Tên hoặc Mô tả vai trò..."
              value={searchRole}
              onChange={(e) => setSearchRole(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 rounded-lg border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <Button onClick={() => { setPage(0); fetchRoles(); }} size="sm" className="h-9 font-bold bg-muted text-foreground hover:bg-muted/80 px-4">
            Tìm
          </Button>
        </div>

        {/* Table Content */}
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
                  <th className="py-3 px-4">Tên vai trò</th>
                  <th className="py-3 px-2">Mã vai trò (Code)</th>
                  <th className="py-3 px-2">Mô tả</th>
                  <th className="py-3 px-2">Phân loại</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {roles.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground text-sm">
                      Không tìm thấy vai trò nào.
                    </td>
                  </tr>
                ) : (
                  roles.map((r) => (
                    <tr key={r.id} className="hover:bg-muted/10 transition-colors">
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-xs bg-primary/10 text-primary font-bold uppercase">
                          {r.name}
                        </span>
                      </td>
                      <td className="py-3 px-2 font-bold text-xs text-muted-foreground">{r.code}</td>
                      <td className="py-3 px-2 text-xs text-muted-foreground">{r.description}</td>
                      <td className="py-3 px-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          r.isSystem ? "bg-indigo-500/10 text-indigo-600" : "bg-orange-500/10 text-orange-600"
                        }`}>
                          {r.isSystem ? "Hệ thống" : "Tùy chỉnh"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            onClick={() => handleOpenAssignModal(r)}
                            variant="ghost"
                            size="icon-xs"
                            title="Phân quyền"
                            className="text-primary hover:bg-primary/10"
                          >
                            <Shield className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={() => handleCloneRole(r)}
                            variant="ghost"
                            size="icon-xs"
                            title="Nhân bản"
                            className="text-green-600 hover:bg-green-500/10"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          {!r.isSystem && (
                            <>
                              <Button
                                onClick={() => { setEditingRole(r); setRoleModalOpen(true); }}
                                variant="ghost"
                                size="icon-xs"
                                title="Chỉnh sửa"
                                className="text-muted-foreground hover:bg-muted"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                onClick={() => handleDeleteRole(r.id, r.name)}
                                variant="ghost"
                                size="icon-xs"
                                title="Xóa"
                                className="text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-border flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Tổng số: {totalElements} vai trò</span>
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

      {/* Role Create/Edit Modal */}
      {roleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl relative animate-in fade-in-50 zoom-in-95 duration-200">
            <button
              onClick={() => setRoleModalOpen(false)}
              className="absolute right-4 top-4 p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="text-lg font-bold text-foreground mb-4">
              {editingRole ? "Cập nhật vai trò" : "Thêm vai trò mới"}
            </h3>

            <form onSubmit={handleSaveRole} className="space-y-4">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Tên vai trò (E.g. AUDITOR, MANAGER)</Label>
                <Input type="text" name="name" defaultValue={editingRole?.name || ""} placeholder="E.g. TA_LEAD" required className="h-9" />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Mô tả vai trò</Label>
                <textarea
                  name="description"
                  defaultValue={editingRole?.description || ""}
                  placeholder="E.g. Quản lý phân bổ trợ giảng và giám sát lớp học..."
                  required
                  className="flex min-h-[80px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setRoleModalOpen(false)} className="h-9">Hủy</Button>
                <Button type="submit" className="h-9 bg-primary text-primary-foreground hover:bg-primary/95">Xác nhận</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Permissions to Role Modal */}
      {assignPermissionsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl relative animate-in fade-in-50 zoom-in-95 duration-200">
            <button
              onClick={() => setAssignPermissionsModalOpen(false)}
              className="absolute right-4 top-4 p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="text-lg font-bold text-foreground mb-1">Cấu hình Quyền hạn</h3>
            <p className="text-xs text-muted-foreground mb-4">Gán các quyền cụ thể cho vai trò: <strong className="uppercase">{assigningRole?.name}</strong></p>

            <form onSubmit={handleAssignPermissions} className="space-y-4">
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {permissions.map((p) => (
                  <label key={p.id} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      name="assignedPerms"
                      value={p.id}
                      defaultChecked={assignedPermissionIds.includes(p.id)}
                      className="rounded border-border text-primary focus:ring-0 h-4 w-4"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-bold text-foreground">{p.name}</p>
                        <span className="px-1.5 py-0.5 rounded text-[8px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold uppercase">{p.entity}:{p.action}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">{p.description}</p>
                    </div>
                  </label>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setAssignPermissionsModalOpen(false)} className="h-9">Hủy</Button>
                <Button type="submit" className="h-9 bg-primary text-primary-foreground hover:bg-primary/95 font-semibold">Lưu thay đổi</Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
