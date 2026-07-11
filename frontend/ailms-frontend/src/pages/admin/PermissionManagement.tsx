import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { permissionApi } from "@/api/permissions/permissionApi";
import type { PermissionResponse } from "@/types/admin";
import {
  FileKey,
  Plus,
  Search,
  Trash2,
  Edit,
  CheckCircle2,
  X,
  ArrowLeft,
  Loader2,
  AlertCircle
} from "lucide-react";

export const PermissionManagement: React.FC = () => {
  const [permissions, setPermissions] = useState<PermissionResponse[]>([]);
  const [searchPermission, setSearchPermission] = useState("");
  const [successBanner, setSuccessBanner] = useState("");
  const [errorBanner, setErrorBanner] = useState("");

  // Loading
  const [loading, setLoading] = useState(false);

  // Pagination
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  // Modals state
  const [permissionModalOpen, setPermissionModalOpen] = useState(false);
  const [editingPermission, setEditingPermission] = useState<PermissionResponse | null>(null);

  useEffect(() => {
    fetchPermissions();
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
    setLoading(true);
    try {
      const params: any = {
        page,
        size: 10,
        sort: "id,desc"
      };
      if (searchPermission) params.search = searchPermission;

      const res = await permissionApi.getPermissions(params);
      if (res.data.success) {
        // Spring Page response
        const pageData = res.data.data;
        setPermissions(pageData.content || []);
        setTotalPages(pageData.totalPages || 0);
        setTotalElements(pageData.totalElements || 0);
      }
    } catch (err: any) {
      showBanner(err.message || "Không thể tải danh sách quyền hạn", true);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePermission = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = new FormData(e.target as HTMLFormElement);
    const name = data.get("name") as string;
    const entity = (data.get("entity") as string).toUpperCase();
    const action = (data.get("action") as string).toUpperCase();
    const description = data.get("description") as string;

    try {
      if (editingPermission) {
        const res = await permissionApi.updatePermission(editingPermission.id, { name, entity, action, description });
        if (res.data.success) {
          showBanner("Cập nhật quyền thành công!");
          fetchPermissions();
        }
      } else {
        const res = await permissionApi.createPermission({ name, entity, action, description });
        if (res.data.success) {
          showBanner("Tạo quyền mới thành công!");
          setPage(0);
          fetchPermissions();
        }
      }
      setPermissionModalOpen(false);
      setEditingPermission(null);
    } catch (err: any) {
      showBanner(err.message || "Lỗi lưu quyền hạn", true);
    }
  };

  const handleDeletePermission = async (id: string, name: string) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa quyền "${name}"?`)) {
      try {
        const res = await permissionApi.deletePermission(id);
        if (res.data.success) {
          showBanner("Xóa quyền hạn thành công!");
          fetchPermissions();
        }
      } catch (err: any) {
        showBanner(err.message || "Lỗi xóa quyền hạn", true);
      }
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 animate-in fade-in-50 duration-300">
      
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
            <FileKey className="h-6 w-6 text-primary" />
            <span>Quản lý Quyền hạn (Permissions)</span>
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
            <Button variant="outline" size="sm" className="h-9 font-bold">
              Vai trò
            </Button>
          </Link>
          <Link to="/admin/permissions">
            <Button variant="default" size="sm" className="h-9 font-bold bg-primary text-primary-foreground">
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

      {/* Main Permissions Card */}
      <Card className="border-border shadow-sm bg-card">
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-border">
          <div>
            <CardTitle className="text-lg font-bold font-heading">Danh mục quyền hạn</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Quản trị chi tiết các quyền CRUD truy cập Module nghiệp vụ (USER, ROLE, COURSE, v.v.)
            </CardDescription>
          </div>

          <Button
            onClick={() => { setEditingPermission(null); setPermissionModalOpen(true); }}
            variant="default"
            size="sm"
            className="h-9 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/95"
          >
            <Plus className="h-4 w-4" />
            <span>Thêm quyền</span>
          </Button>
        </CardHeader>

        {/* Search */}
        <div className="p-4 bg-muted/20 border-b border-border/80 flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Tìm theo Tên quyền, Thực thể (Entity) hoặc Hành động (Action)..."
              value={searchPermission}
              onChange={(e) => setSearchPermission(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 rounded-lg border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <Button onClick={() => { setPage(0); fetchPermissions(); }} size="sm" className="h-9 font-bold bg-muted text-foreground hover:bg-muted/80 px-4">
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
                  <th className="py-3 px-4 w-16">ID</th>
                  <th className="py-3 px-2">Tên quyền</th>
                  <th className="py-3 px-2">Thực thể (Entity)</th>
                  <th className="py-3 px-2">Hành động (Action)</th>
                  <th className="py-3 px-2">Mô tả</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {permissions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground text-sm">
                      Không tìm thấy quyền hạn nào.
                    </td>
                  </tr>
                ) : (
                  permissions.map((p) => (
                    <tr key={p.id} className="hover:bg-muted/10 transition-colors">
                      <td className="py-3 px-4 font-bold text-xs text-muted-foreground">#{p.id}</td>
                      <td className="py-3 px-2 font-bold text-foreground text-xs">{p.name}</td>
                      <td className="py-3 px-2">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200 font-bold uppercase">
                          {p.entity}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          p.action === "READ" ? "bg-green-500/10 text-green-600" :
                          p.action === "WRITE" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
                        }`}>
                          {p.action}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-xs text-muted-foreground">{p.description}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            onClick={() => { setEditingPermission(p); setPermissionModalOpen(true); }}
                            variant="ghost"
                            size="icon-xs"
                            title="Chỉnh sửa"
                            className="text-muted-foreground hover:bg-muted"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={() => handleDeletePermission(p.id, p.name)}
                            variant="ghost"
                            size="icon-xs"
                            title="Xóa"
                            className="text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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
            <span className="text-xs text-muted-foreground">Tổng số: {totalElements} quyền hạn</span>
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

      {/* Permission Create/Edit Modal */}
      {permissionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl relative animate-in fade-in-50 zoom-in-95 duration-200">
            <button
              onClick={() => setPermissionModalOpen(false)}
              className="absolute right-4 top-4 p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="text-lg font-bold text-foreground mb-4">
              {editingPermission ? "Cập nhật quyền hạn" : "Tạo quyền hạn mới"}
            </h3>

            <form onSubmit={handleSavePermission} className="space-y-4">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Tên quyền hiển thị</Label>
                <Input type="text" name="name" defaultValue={editingPermission?.name || ""} placeholder="Xem khóa học của tôi" required className="h-9" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Thực thể (Entity)</Label>
                  <Input type="text" name="entity" defaultValue={editingPermission?.entity || ""} placeholder="COURSE" required className="h-9" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Hành động (Action)</Label>
                  <select name="action" defaultValue={editingPermission?.action || "READ"} className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none">
                    <option value="READ">READ</option>
                    <option value="WRITE">WRITE</option>
                    <option value="DELETE">DELETE</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Mô tả quyền hạn</Label>
                <textarea
                  name="description"
                  defaultValue={editingPermission?.description || ""}
                  placeholder="Cho phép đọc thông tin cơ bản về danh sách và chi tiết các khóa học được phân bổ..."
                  required
                  className="flex min-h-[80px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setPermissionModalOpen(false)} className="h-9">Hủy</Button>
                <Button type="submit" className="h-9 bg-primary text-primary-foreground hover:bg-primary/95">Xác nhận</Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
