import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { userApi } from "@/api/users/userApi";
import { roleApi } from "@/api/roles/roleApi";
import type { UserResponse, RoleResponse } from "@/types/admin";
import {
  Users,
  Plus,
  Search,
  Trash2,
  Edit,
  UserCheck,
  CheckCircle2,
  X,
  Mail,
  UserPlus,
  ArrowLeft,
  Loader2,
  AlertCircle
} from "lucide-react";

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [roles, setRoles] = useState<RoleResponse[]>([]);
  const [searchUser, setSearchUser] = useState("");
  const [filterUserRole, setFilterUserRole] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  
  // Banners
  const [successBanner, setSuccessBanner] = useState("");
  const [errorBanner, setErrorBanner] = useState("");

  // Loading
  const [loading, setLoading] = useState(false);

  // Pagination
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  // Modals state
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserResponse | null>(null);

  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");

  const [assignRoleModalOpen, setAssignRoleModalOpen] = useState(false);
  const [assigningUser, setAssigningUser] = useState<UserResponse | null>(null);

  const [bulkAssignRoleModalOpen, setBulkAssignRoleModalOpen] = useState(false);

  useEffect(() => {
    fetchRoles();
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [page, filterUserRole]);

  const showBanner = (msg: string, isError = false) => {
    if (isError) {
      setErrorBanner(msg);
      setTimeout(() => setErrorBanner(""), 3000);
    } else {
      setSuccessBanner(msg);
      setTimeout(() => setSuccessBanner(""), 3000);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await roleApi.getAllRoles();
      if (res.data.success) {
        setRoles(res.data.data);
      }
    } catch (err: any) {
      showBanner(err.message || "Không thể tải danh sách vai trò", true);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params: any = {
        page,
        size: 10,
        sortBy: "id",
        sortDirection: "DESC"
      };
      if (searchUser) params.search = searchUser;
      if (filterUserRole) params.role = filterUserRole;

      const res = await userApi.getUsers(params);
      if (res.data.success) {
        // Spring Page response has content, totalPages, totalElements
        const pageData = res.data.data;
        setUsers(pageData.content || []);
        setTotalPages(pageData.totalPages || 0);
        setTotalElements(pageData.totalElements || 0);
      }
    } catch (err: any) {
      showBanner(err.message || "Không thể tải danh sách người dùng", true);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = new FormData(e.target as HTMLFormElement);
    const fullName = data.get("fullName") as string;
    const email = data.get("email") as string;
    const phone = data.get("phone") as string;
    const gender = parseInt(data.get("gender") as string);
    const dateOfBirth = data.get("dateOfBirth") as string;

    try {
      if (editingUser) {
        const res = await userApi.updateUser(editingUser.id, { fullName, phone, gender, dateOfBirth });
        if (res.data.success) {
          showBanner("Cập nhật thông tin người dùng thành công!");
          fetchUsers();
        }
      } else {
        const username = data.get("username") as string;
        const res = await userApi.createUser({ username, email, fullName, phone, gender, dateOfBirth });
        if (res.data.success) {
          showBanner("Thêm người dùng mới thành công!");
          setPage(0);
          fetchUsers();
        }
      }
      setUserModalOpen(false);
      setEditingUser(null);
    } catch (err: any) {
      showBanner(err.message || "Lỗi lưu thông tin người dùng", true);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa thành viên này?")) {
      try {
        const res = await userApi.deleteUser(id);
        if (res.data.success) {
          showBanner("Xóa người dùng thành công!");
          fetchUsers();
          setSelectedUserIds(selectedUserIds.filter(selectedId => selectedId !== id));
        }
      } catch (err: any) {
        showBanner(err.message || "Lỗi xóa người dùng", true);
      }
    }
  };

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await userApi.inviteUser({ email: inviteEmail });
      if (res.data.success) {
        showBanner(`Đã gửi thư mời đăng ký thành công đến: ${inviteEmail}`);
        setInviteModalOpen(false);
        setInviteEmail("");
      }
    } catch (err: any) {
      showBanner(err.message || "Lỗi gửi thư mời", true);
    }
  };

  const handleAssignRoles = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningUser) return;
    const data = new FormData(e.target as HTMLFormElement);
    const selectedRoles = data.getAll("userRoles") as string[];

    try {
      const res = await userApi.assignRoles(assigningUser.id, { roleIds: selectedRoles.map((id) => Number(id)) });
      if (res.data.success) {
        showBanner(`Gán vai trò cho ${assigningUser.fullName} thành công!`);
        fetchUsers();
        setAssignRoleModalOpen(false);
        setAssigningUser(null);
      }
    } catch (err: any) {
      showBanner(err.message || "Lỗi gán vai trò", true);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedUserIds.length === 0) return;
    if (window.confirm(`Xóa ${selectedUserIds.length} người dùng đã chọn?`)) {
      try {
        const res = await userApi.bulkDelete({ ids: selectedUserIds });
        if (res.data.success) {
          showBanner("Đã xóa hàng loạt thành công!");
          fetchUsers();
          setSelectedUserIds([]);
        }
      } catch (err: any) {
        showBanner(err.message || "Lỗi xóa hàng loạt", true);
      }
    }
  };

  const handleBulkAssignRole = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = new FormData(e.target as HTMLFormElement);
    const targetRole = data.get("bulkRole") as string;

    try {
      const res = await userApi.bulkAssignRole({ userIds: selectedUserIds, roleName: targetRole });
      if (res.data.success) {
        showBanner(`Gán vai trò ${targetRole} thành công!`);
        fetchUsers();
        setBulkAssignRoleModalOpen(false);
        setSelectedUserIds([]);
      }
    } catch (err: any) {
      showBanner(err.message || "Lỗi gán vai trò hàng loạt", true);
    }
  };

  const handleSelectAllUsers = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedUserIds(users.map(u => u.id));
    } else {
      setSelectedUserIds([]);
    }
  };

  const handleSelectUser = (id: string) => {
    if (selectedUserIds.includes(id)) {
      setSelectedUserIds(selectedUserIds.filter(selectedId => selectedId !== id));
    } else {
      setSelectedUserIds([...selectedUserIds, id]);
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
            <Users className="h-6 w-6 text-primary" />
            <span>Quản lý Người dùng hệ thống</span>
          </h1>
        </div>

        {/* Sub Nav Links */}
        <div className="flex gap-2">
          <Link to="/admin/users">
            <Button variant="default" size="sm" className="h-9 font-bold bg-primary text-primary-foreground">
              Người dùng
            </Button>
          </Link>
          <Link to="/admin/roles">
            <Button variant="outline" size="sm" className="h-9 font-bold">
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

      {/* Main Table Card */}
      <Card className="border-border shadow-sm bg-card">
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-border">
          <div>
            <CardTitle className="text-lg font-bold font-heading">Danh sách Tài khoản</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Tìm kiếm tài khoản, chỉ định vai trò thành viên hệ thống và thực thi thao tác hàng loạt.
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {selectedUserIds.length > 0 && (
              <>
                <Button
                  onClick={() => setBulkAssignRoleModalOpen(true)}
                  variant="outline"
                  size="sm"
                  className="h-9 gap-1 text-primary border-primary/30"
                >
                  <UserCheck className="h-4 w-4" />
                  <span>Gán vai trò loạt ({selectedUserIds.length})</span>
                </Button>
                <Button
                  onClick={handleBulkDelete}
                  variant="destructive"
                  size="sm"
                  className="h-9 gap-1"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Xóa đã chọn</span>
                </Button>
              </>
            )}

            <Button
              onClick={() => setInviteModalOpen(true)}
              variant="outline"
              size="sm"
              className="h-9 gap-1.5"
            >
              <Mail className="h-4 w-4" />
              <span>Mời thành viên</span>
            </Button>

            <Button
              onClick={() => { setEditingUser(null); setUserModalOpen(true); }}
              variant="default"
              size="sm"
              className="h-9 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/95"
            >
              <Plus className="h-4 w-4" />
              <span>Thêm mới</span>
            </Button>
          </div>
        </CardHeader>

        {/* Filters */}
        <div className="p-4 flex flex-col sm:flex-row gap-3 bg-muted/20 border-b border-border/80">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Tìm theo Họ tên, Email, số điện thoại..."
              value={searchUser}
              onChange={(e) => setSearchUser(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 rounded-lg border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <select
            value={filterUserRole}
            onChange={(e) => setFilterUserRole(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-border bg-background text-sm outline-none"
          >
            <option value="">Tất cả vai trò</option>
            {roles.map((r) => (
              <option key={r.name} value={r.name}>{r.name}</option>
            ))}
          </select>

          <Button onClick={() => { setPage(0); fetchUsers(); }} size="sm" className="h-9 font-bold bg-muted text-foreground hover:bg-muted/80 px-4">
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
                  <th className="py-3 px-4 w-8">
                    <input
                      type="checkbox"
                      checked={users.length > 0 && selectedUserIds.length === users.length}
                      onChange={handleSelectAllUsers}
                      className="rounded border-border text-primary focus:ring-0"
                    />
                  </th>
                  <th className="py-3 px-2 w-12 text-center">STT</th>
                  <th className="py-3 px-2">Họ & Tên</th>
                  <th className="py-3 px-2">Liên hệ</th>
                  <th className="py-3 px-2">Vai trò</th>
                  <th className="py-3 px-2">Trạng thái</th>
                  <th className="py-3 px-2">Ngày tham gia</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-muted-foreground text-sm">
                      Không tìm thấy thành viên nào.
                    </td>
                  </tr>
                ) : (
                  users.map((u, index) => (
                    <tr key={u.username || index} className="hover:bg-muted/10 transition-colors">
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={selectedUserIds.includes(u.id)}
                          onChange={() => handleSelectUser(u.id)}
                          className="rounded border-border text-primary focus:ring-0"
                        />
                      </td>
                      <td className="py-3 px-2 text-xs font-bold text-muted-foreground text-center">
                        {page * 10 + index + 1}
                      </td>
                      <td className="py-3 px-2">
                        <div>
                          <p className="font-bold text-foreground">{u.fullName}</p>
                          <p className="text-xs text-muted-foreground">@{u.username}</p>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-xs">
                        <p className="text-muted-foreground">{u.email}</p>
                        <p className="text-muted-foreground">{u.phone}</p>
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex flex-wrap gap-1">
                          {u.roles && u.roles.map((rName: string, i: number) => (
                            <span key={i} className="px-2 py-0.5 rounded text-[10px] bg-primary/10 text-primary font-bold uppercase">
                              {rName}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-2 text-xs">
                        <span className={`px-2 py-0.5 rounded font-bold ${
                          u.status === "ACTIVE" ? "bg-green-500/10 text-green-600" : "bg-destructive/10 text-destructive"
                        }`}>
                          {u.status}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-xs text-muted-foreground">
                        {u.createdAt ? u.createdAt.slice(0, 10) : "N/A"}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            onClick={() => { setAssigningUser(u); setAssignRoleModalOpen(true); }}
                            variant="ghost"
                            size="icon-xs"
                            title="Gán vai trò"
                            className="text-primary hover:bg-primary/10"
                          >
                            <UserCheck className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={() => { setEditingUser(u); setUserModalOpen(true); }}
                            variant="ghost"
                            size="icon-xs"
                            title="Chỉnh sửa"
                            className="text-muted-foreground hover:bg-muted"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={() => handleDeleteUser(u.id)}
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

        {/* Pagination footer */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-border flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Tổng số: {totalElements} người dùng</span>
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

      {/* User Create/Edit Modal */}
      {userModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl relative animate-in fade-in-50 zoom-in-95 duration-200">
            <button
              onClick={() => setUserModalOpen(false)}
              className="absolute right-4 top-4 p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
            
            <h3 className="text-lg font-bold text-foreground mb-4">
              {editingUser ? "Cập nhật tài khoản" : "Tạo tài khoản mới"}
            </h3>

            <form onSubmit={handleSaveUser} className="space-y-4">
              {!editingUser && (
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Tên tài khoản</Label>
                  <Input type="text" name="username" placeholder="datbritget" required className="h-9" />
                </div>
              )}
              
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Họ và tên</Label>
                <Input type="text" name="fullName" defaultValue={editingUser?.fullName || ""} placeholder="Vũ Tiến Đạt" required className="h-9" />
              </div>

              {!editingUser && (
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Email liên hệ</Label>
                  <Input type="email" name="email" placeholder="dat.vt@ailms.edu.vn" required className="h-9" />
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Số điện thoại</Label>
                <Input type="text" name="phone" defaultValue={editingUser?.phone || ""} placeholder="0912345678" className="h-9" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Giới tính</Label>
                  <select name="gender" defaultValue={editingUser?.gender ?? "0"} className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none">
                    <option value="0">Nam</option>
                    <option value="1">Nữ</option>
                    <option value="2">Khác</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Ngày sinh</Label>
                  <Input type="date" name="dateOfBirth" defaultValue={editingUser?.dateOfBirth ? editingUser.dateOfBirth.slice(0, 10) : ""} className="h-9" />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setUserModalOpen(false)} className="h-9">Hủy</Button>
                <Button type="submit" className="h-9 bg-primary text-primary-foreground hover:bg-primary/95">Xác nhận</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invite Member Modal */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-2xl relative animate-in fade-in-50 zoom-in-95 duration-200">
            <button
              onClick={() => setInviteModalOpen(false)}
              className="absolute right-4 top-4 p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="text-lg font-bold text-foreground mb-1">Mời tham gia hệ thống</h3>
            <p className="text-xs text-muted-foreground mb-4">Gửi thư mời kích hoạt tài khoản.</p>

            <form onSubmit={handleInviteUser} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Email nhận thư mời</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4.5 w-4.5 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="partner@ailms.edu.vn"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                    className="pl-10 h-10"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setInviteModalOpen(false)} className="h-9">Hủy</Button>
                <Button type="submit" className="h-9 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/95">
                  <UserPlus className="h-4 w-4" />
                  <span>Gửi thư mời</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Individual Assign Role Modal */}
      {assignRoleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-2xl relative animate-in fade-in-50 zoom-in-95 duration-200">
            <button
              onClick={() => setAssignRoleModalOpen(false)}
              className="absolute right-4 top-4 p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="text-lg font-bold text-foreground mb-1">Gán vai trò tài khoản</h3>
            <p className="text-xs text-muted-foreground mb-4">Cập nhật vai trò cho: <strong>{assigningUser?.fullName}</strong></p>

            <form onSubmit={handleAssignRoles} className="space-y-4">
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {roles.map((r) => (
                  <label key={r.id} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      name="userRoles"
                      value={r.id}
                      defaultChecked={assigningUser?.roles?.includes(r.name) || assigningUser?.roles?.includes(r.code)}
                      className="rounded border-border text-primary focus:ring-0 h-4 w-4"
                    />
                    <div>
                      <p className="text-xs font-bold text-foreground">{r.name} ({r.code})</p>
                      <p className="text-[10px] text-muted-foreground line-clamp-1">{r.description}</p>
                    </div>
                  </label>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setAssignRoleModalOpen(false)} className="h-9">Hủy</Button>
                <Button type="submit" className="h-9 bg-primary text-primary-foreground hover:bg-primary/95">Đồng ý</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Assign Roles Modal */}
      {bulkAssignRoleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-2xl relative animate-in fade-in-50 zoom-in-95 duration-200">
            <button
              onClick={() => setBulkAssignRoleModalOpen(false)}
              className="absolute right-4 top-4 p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="text-lg font-bold text-foreground mb-1">Gán vai trò hàng loạt</h3>
            <p className="text-xs text-muted-foreground mb-4">Gán thêm vai trò cho {selectedUserIds.length} người dùng đã chọn.</p>

            <form onSubmit={handleBulkAssignRole} className="space-y-4">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Chọn vai trò bổ sung</Label>
                <select name="bulkRole" className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none">
                  {roles.map((r) => (
                    <option key={r.name} value={r.name}>{r.name} - {r.description.slice(0, 35)}...</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setBulkAssignRoleModalOpen(false)} className="h-9">Hủy</Button>
                <Button type="submit" className="h-9 bg-primary text-primary-foreground hover:bg-primary/95">Xác nhận</Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
