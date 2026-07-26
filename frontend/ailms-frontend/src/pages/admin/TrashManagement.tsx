import React, { useState, useEffect } from "react";
import { userApi } from "@/api/users/userApi";
import type { UserResponse } from "@/types/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Trash2,
  Search,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";

export const TrashManagement: React.FC = () => {
  const [trashItems, setTrashItems] = useState<UserResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);
  const [toastMessage, setToastMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  const showToast = (text: string, isError = false) => {
    setToastMessage({ text, isError });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchTrash = async () => {
    setLoading(true);
    try {
      const res = await userApi.getTrashUsers();
      if (res.data.success && Array.isArray(res.data.data)) {
        setTrashItems(res.data.data);
      } else {
        setTrashItems([]);
      }
    } catch (err: any) {
      showToast(err.message || "Không thể tải danh sách thùng rác", true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrash();
  }, []);

  const handleHardDelete = async (id: string | number) => {
    if (!window.confirm("CẢNH BÁO: Thao tác xóa vĩnh viễn sẽ xóa hoàn toàn tài khoản khỏi CSDL và KHÔNG THỂ khôi phục! Bạn có chắc chắn không?")) {
      return;
    }
    try {
      const res = await userApi.hardDeleteUser(id);
      if (res.data.success) {
        showToast("Đã xóa vĩnh viễn tài khoản thành công!");
        fetchTrash();
        setSelectedIds((prev) => prev.filter((item) => String(item) !== String(id)));
      }
    } catch (err: any) {
      showToast(err.message || "Lỗi xóa vĩnh viễn tài khoản", true);
    }
  };

  const handleBulkHardDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`CẢNH BÁO NGHIÊM TRỌNG: Bạn có chắc chắn muốn xóa vĩnh viễn ${selectedIds.length} tài khoản đã chọn khỏi CSDL?`)) {
      return;
    }
    try {
      const res = await userApi.bulkHardDeleteUsers(selectedIds);
      if (res.data.success) {
        showToast(`Đã xóa vĩnh viễn ${selectedIds.length} tài khoản khỏi CSDL!`);
        setSelectedIds([]);
        fetchTrash();
      }
    } catch (err: any) {
      showToast(err.message || "Lỗi xóa vĩnh viễn hàng loạt", true);
    }
  };

  const filteredItems = trashItems.filter(
    (item) =>
      (item.fullName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.username || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.email || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-none w-full px-4 sm:px-6 lg:px-10 py-6 space-y-6 animate-in fade-in-50 duration-300">
      
      {/* Toast Notification Banners */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl text-white px-5 py-3.5 shadow-2xl animate-in slide-in-from-bottom-5 duration-300 ${
            toastMessage.isError ? "bg-destructive" : "bg-emerald-600"
          }`}
        >
          {toastMessage.isError ? <AlertCircle className="h-5 w-5 shrink-0" /> : <CheckCircle2 className="h-5 w-5 shrink-0" />}
          <span className="text-sm font-semibold">{toastMessage.text}</span>
        </div>
      )}

      {/* Navigation Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/30 pb-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-bold text-primary mb-1">
            <Link to="/admin/users" className="flex items-center gap-1 hover:underline">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Quay lại Quản lý Người dùng (Users)</span>
            </Link>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground flex items-center gap-3 mt-3">
            <div className="p-2.5 rounded-2xl bg-destructive/10 text-destructive">
              <Trash2 className="h-7 w-7" />
            </div>
            <span>Quản Lý Thùng Rác Tài Khoản Người Dùng</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Quản lý các tài khoản người dùng bị xóa mềm (trạng thái <code className="font-mono text-destructive">DELETED</code>). Bạn có thể xóa cứng vĩnh viễn để giải phóng CSDL.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={fetchTrash} variant="outline" size="sm" className="rounded-xl gap-1 text-xs font-bold">
            <RefreshCw className="h-3.5 w-3.5" /> Làm mới
          </Button>
        </div>
      </div>

      {/* Warning Alert Banner */}
      <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-between text-xs text-destructive">
        <div className="flex items-center gap-2.5">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <div>
            <strong className="font-extrabold block text-sm">Chú ý về Thao tác Xóa Cứng (Hard Delete):</strong>
            <span>Các tài khoản đã bị xóa cứng sẽ bị xóa hoàn toàn khỏi cơ sở dữ liệu (gồm thông tin tài khoản, vai trò và hồ sơ liên quan). Thao tác không thể phục hồi.</span>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <Card className="border border-border rounded-2xl overflow-hidden bg-card shadow-sm">
        <CardHeader className="p-4 bg-muted/20 border-b border-border/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Users className="h-5 w-5 text-destructive" />
              <span>Danh sách tài khoản trong Thùng rác ({filteredItems.length})</span>
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Tìm kiếm và xóa vĩnh viễn các tài khoản có trạng thái DELETED khỏi hệ thống.
            </CardDescription>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Bar */}
            <div className="relative w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                placeholder="Tìm username, họ tên, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-9 text-xs bg-background border-border"
              />
            </div>
          </div>
        </CardHeader>

        {/* Selected Batch Operations Bar */}
        {selectedIds.length > 0 && (
          <div className="px-4 py-2.5 bg-destructive/10 border-b border-destructive/20 flex items-center justify-between gap-4 animate-in fade-in-50">
            <span className="text-xs font-bold text-destructive flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Đã chọn {selectedIds.length} tài khoản
            </span>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleBulkHardDelete}
                variant="destructive"
                size="sm"
                className="h-8 text-xs font-bold gap-1 bg-destructive text-white hover:bg-destructive/90"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Xóa vĩnh viễn các mục chọn</span>
              </Button>
              <Button
                onClick={() => setSelectedIds([])}
                variant="ghost"
                size="sm"
                className="h-8 text-xs font-semibold"
              >
                Bỏ chọn
              </Button>
            </div>
          </div>
        )}

        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="border-b border-border/40">
                <TableHead className="w-12 text-center pl-4">
                  <input
                    type="checkbox"
                    checked={filteredItems.length > 0 && selectedIds.length === filteredItems.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds(filteredItems.map((item) => item.id));
                      } else {
                        setSelectedIds([]);
                      }
                    }}
                    className="rounded border-border text-primary h-4 w-4"
                  />
                </TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider">ID User</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider">Tên đăng nhập</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider">Họ & Tên / Email</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider">Vai Trò</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider">Trạng Thái</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-right pr-4">Hành Động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-xs text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-destructive" />
                    Đang tải dữ liệu thùng rác...
                  </TableCell>
                </TableRow>
              ) : filteredItems.length > 0 ? (
                filteredItems.map((item) => (
                  <TableRow key={item.id} className="hover:bg-muted/40 transition-colors border-b border-border/30">
                    <TableCell className="text-center pl-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(item.id)}
                        onChange={() => {
                          if (selectedIds.includes(item.id)) {
                            setSelectedIds(selectedIds.filter((id) => id !== item.id));
                          } else {
                            setSelectedIds([...selectedIds, item.id]);
                          }
                        }}
                        className="rounded border-border text-primary h-4 w-4"
                      />
                    </TableCell>
                    <TableCell className="font-mono font-bold text-xs text-destructive">
                      <span className="px-2 py-0.5 rounded-lg bg-destructive/10 border border-destructive/20">
                        #{item.id}
                      </span>
                    </TableCell>
                    <TableCell className="font-semibold text-xs text-foreground">
                      {item.username}
                    </TableCell>
                    <TableCell>
                      <div className="font-bold text-xs text-foreground">{item.fullName || item.username}</div>
                      <div className="text-[10px] text-muted-foreground">{item.email}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {item.roles && item.roles.length > 0 ? (
                          item.roles.map((r: any, rIdx: number) => (
                            <span key={rIdx} className="px-2 py-0.5 rounded-md bg-muted text-[10px] font-bold border border-border">
                              {typeof r === "object" ? (r.name || r.code) : String(r)}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-muted-foreground">Chưa phân vai trò</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="px-2.5 py-0.5 rounded-full bg-destructive/10 text-destructive text-[10px] font-bold border border-destructive/20">
                        {item.status || "DELETED"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right pr-4">
                      <Button
                        onClick={() => handleHardDelete(item.id)}
                        variant="destructive"
                        size="sm"
                        className="h-8 text-xs font-bold gap-1 bg-destructive text-white hover:bg-destructive/90"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Xóa vĩnh viễn</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="py-16 text-center text-muted-foreground text-sm">
                    <Trash2 className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                    Thùng rác hiện đang trống. Không có tài khoản nào có trạng thái DELETED.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
