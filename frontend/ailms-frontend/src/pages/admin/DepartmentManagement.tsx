import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  departmentApi,
  type DepartmentResponse,
  type CreateDepartmentRequest,
  type UpdateDepartmentRequest,
} from "@/api/departments/departmentApi";
import {
  Building2,
  Plus,
  Search,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calendar,
  Eye,
  Users,
  Briefcase,
  UserCheck
} from "lucide-react";

const getPageNumbers = (currentPage: number, total: number) => {
  const pages: (number | string)[] = [];
  if (total <= 7) {
    for (let i = 0; i < total; i++) pages.push(i);
  } else {
    pages.push(0);
    if (currentPage > 2) {
      pages.push("...");
    }
    const start = Math.max(1, currentPage - 1);
    const end = Math.min(total - 2, currentPage + 1);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    if (currentPage < total - 3) {
      pages.push("...");
    }
    pages.push(total - 1);
  }
  return pages;
};

export const DepartmentManagement: React.FC = () => {
  const [departments, setDepartments] = useState<DepartmentResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Banners
  const [successBanner, setSuccessBanner] = useState("");
  const [errorBanner, setErrorBanner] = useState("");

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Pagination
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [jumpPageInput, setJumpPageInput] = useState<string>("1");

  // Edit / Create Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<DepartmentResponse | null>(null);

  // View Detail Modal State
  const [detailDeptModalOpen, setDetailDeptModalOpen] = useState(false);
  const [viewingDept, setViewingDept] = useState<DepartmentResponse | null>(null);
  const [deptEmployees, setDeptEmployees] = useState<any[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Form State
  const [formCode, setFormCode] = useState("");
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formStatus, setFormStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");

  const showBanner = (msg: string, isError = false) => {
    if (isError) {
      setErrorBanner(msg);
      setTimeout(() => setErrorBanner(""), 4000);
    } else {
      setSuccessBanner(msg);
      setTimeout(() => setSuccessBanner(""), 3000);
    }
  };

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const params: any = {
        page,
        size: pageSize,
        sort: ["id:desc"],
      };
      if (searchTerm.trim()) {
        params.keyword = searchTerm.trim();
      }
      if (statusFilter !== "ALL") {
        params.status = statusFilter;
      }

      const res = await departmentApi.searchDepartments(params);
      if (res.data.success) {
        const pageData = res.data.data;
        setDepartments(pageData.content || []);
        setTotalPages(pageData.totalPages || 0);
        setTotalElements(pageData.totalElements || 0);
      }
    } catch (err: any) {
      showBanner(err.message || "Không thể tải danh sách phòng ban từ server!", true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setJumpPageInput(String(page + 1));
  }, [page]);

  useEffect(() => {
    fetchDepartments();
  }, [page, pageSize, statusFilter]);

  // Debounced search when user types keyword
  useEffect(() => {
    const timer = setTimeout(() => {
      if (page === 0) {
        fetchDepartments();
      } else {
        setPage(0);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleOpenDetailModal = async (dept: DepartmentResponse) => {
    setViewingDept(dept);
    setDetailDeptModalOpen(true);
    setLoadingDetail(true);
    try {
      const res = await departmentApi.getEmployeesByDepartmentId(dept.id);
      if (res.data.success) {
        setDeptEmployees(res.data.data || []);
      }
    } catch (err: any) {
      showBanner(err.message || "Lỗi tải thông tin danh sách nhân sự phòng ban", true);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleOpenModal = (dept?: DepartmentResponse) => {
    if (dept) {
      setEditingDept(dept);
      setFormCode(dept.code || "");
      setFormName(dept.name || "");
      setFormDescription(dept.description || "");
      setFormStatus(dept.status || "ACTIVE");
    } else {
      setEditingDept(null);
      setFormCode("");
      setFormName("");
      setFormDescription("");
      setFormStatus("ACTIVE");
    }
    setIsModalOpen(true);
  };

  const handleSaveDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      showBanner("Vui lòng nhập tên phòng ban!", true);
      return;
    }

    setSaving(true);
    try {
      if (editingDept) {
        const payload: UpdateDepartmentRequest = {
          name: formName.trim(),
          description: formDescription.trim(),
          status: formStatus,
        };
        const res = await departmentApi.updateDepartment(editingDept.id, payload);
        if (res.data.success) {
          showBanner(`Cập nhật phòng ban "${formName}" thành công!`);
          setIsModalOpen(false);
          fetchDepartments();
        }
      } else {
        const payload: CreateDepartmentRequest = {
          code: formCode.trim() || undefined,
          name: formName.trim(),
          description: formDescription.trim() || undefined,
        };
        const res = await departmentApi.createDepartment(payload);
        if (res.data.success) {
          showBanner(`Tạo mới phòng ban "${formName}" thành công!`);
          setIsModalOpen(false);
          setPage(0);
          fetchDepartments();
        }
      }
    } catch (err: any) {
      showBanner(err.message || "Đã có lỗi xảy ra khi lưu phòng ban!", true);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDepartment = async (id: number, name: string) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa phòng ban "${name}"?`)) {
      try {
        const res = await departmentApi.deleteDepartment(id);
        if (res.data.success) {
          showBanner(`Đã xóa phòng ban "${name}" thành công!`);
          fetchDepartments();
        }
      } catch (err: any) {
        showBanner(err.message || `Không thể xóa phòng ban "${name}"!`, true);
      }
    }
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return "N/A";
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString("vi-VN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 space-y-6 animate-in fade-in duration-300">
      {/* Notifications / Banners */}
      {successBanner && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl bg-emerald-600 text-white px-4 py-3 shadow-xl animate-in slide-in-from-bottom-5 duration-300">
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

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            <span>Quản Lý Phòng Ban (Department Management)</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Quản lý sơ đồ tổ chức phòng ban hệ thống (Kết nối API dữ liệu thực tế backend).
          </p>
        </div>
        <Button onClick={() => handleOpenModal()} className="rounded-xl font-bold text-xs bg-primary text-primary-foreground gap-1">
          <Plus className="h-4 w-4" /> Thêm Phòng Ban Mới
        </Button>
      </div>

      {/* KPI Cards Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="p-4 border border-border/80 bg-card rounded-2xl flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/10 text-primary">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase">Tổng Số Phòng Ban</p>
            <p className="text-xl font-extrabold text-foreground">{totalElements}</p>
          </div>
        </Card>

        <Card className="p-4 border border-border/80 bg-card rounded-2xl flex items-center gap-3">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase">Đang Hoạt Động (Trang Hiện Tại)</p>
            <p className="text-xl font-extrabold text-foreground">
              {departments.filter((d) => d.status === "ACTIVE").length}
            </p>
          </div>
        </Card>

        <Card className="p-4 border border-border/80 bg-card rounded-2xl flex items-center gap-3">
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-600">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase">Tạm Ngưng (Trang Hiện Tại)</p>
            <p className="text-xl font-extrabold text-foreground">
              {departments.filter((d) => d.status === "INACTIVE").length}
            </p>
          </div>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="border border-border/80 rounded-2xl overflow-hidden bg-card shadow-sm">
        {/* Toolbar & Filters */}
        <div className="p-4 bg-muted/20 border-b border-border/30 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-12 gap-3 items-end">
          <div className="flex flex-col gap-1 lg:col-span-8">
            <Label className="text-[11px] font-bold text-muted-foreground">Từ khóa tìm kiếm</Label>
            <div className="relative w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                placeholder="Tìm theo Mã PB, Tên phòng ban hoặc Mô tả..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-9 text-xs border border-border bg-background rounded-lg focus-visible:ring-2 focus-visible:ring-primary/20"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1 lg:col-span-4">
            <Label className="text-[11px] font-bold text-muted-foreground">Trạng thái phòng ban</Label>
            <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val || "ALL"); setPage(0); }}>
              <SelectTrigger className="h-9 text-xs bg-background border border-border rounded-lg font-semibold">
                <SelectValue placeholder="Tất cả trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
                <SelectItem value="ACTIVE">Đang hoạt động</SelectItem>
                <SelectItem value="INACTIVE">Tạm ngưng</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table Content */}
        <CardContent className="p-0 relative">
          {loading && (
            <div className="absolute inset-0 bg-background/60 backdrop-blur-xs flex items-center justify-center z-20">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
          )}

          <Table containerClassName="max-h-[calc(100vh-320px)] min-h-[350px] overflow-auto border-b border-border/20" className="-mt-3 pb-4">
            <TableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur-md shadow-2xs border-b border-border/40">
              <TableRow className="border-b border-border/30 bg-muted/20 hover:bg-muted/20">
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-4">Mã Phòng Ban</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tên Phòng Ban & Mô Tả</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ngày Tạo</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Trạng Thái</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right pr-4">Hành Động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="opacity-90">
              {departments.length > 0 ? (
                departments.map((dept) => (
                  <TableRow key={dept.id} className="hover:bg-foreground/10 transition-colors border-border/30">
                    <TableCell className="font-mono font-bold text-xs text-primary pl-4">
                      <span className="px-2.5 py-0.5 rounded-lg bg-primary/10 border border-primary/20">
                        {dept.code}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-xs text-foreground max-w-sm">{dept.name}</div>
                      <div className="text-[10px] text-muted-foreground line-clamp-1 max-w-sm mt-0.5">
                        {dept.description || "Chưa có mô tả"}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(dept.createdAt)}
                    </TableCell>
                    <TableCell>
                      {dept.status === "ACTIVE" ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-bold border border-emerald-500/20">
                          Đang hoạt động
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600 text-[10px] font-bold border border-rose-500/20">
                          Tạm ngưng
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right pr-4">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          onClick={() => handleOpenDetailModal(dept)}
                          variant="ghost"
                          size="icon"
                          title="Xem chi tiết"
                          className="h-7 w-7 text-indigo-600 hover:bg-indigo-500/10"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          onClick={() => handleOpenModal(dept)}
                          variant="ghost"
                          size="icon"
                          title="Chỉnh sửa"
                          className="h-7 w-7 text-muted-foreground hover:bg-muted"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          onClick={() => handleDeleteDepartment(dept.id, dept.name)}
                          variant="ghost"
                          size="icon"
                          title="Xóa"
                          className="h-7 w-7 text-rose-600 hover:bg-rose-500/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-muted-foreground text-sm">
                    {loading ? "Đang tải dữ liệu..." : "Không tìm thấy phòng ban nào phù hợp."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>

        {/* Modern Table Footer */}
        <div className="px-5 py-3 border-t border-border/40 bg-card/40 flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
          {/* Left: Total Results Summary */}
          <div className="text-muted-foreground font-medium">
            Showing <span className="font-semibold text-foreground">{totalElements === 0 ? 0 : page * pageSize + 1}</span> to{" "}
            <span className="font-semibold text-foreground">{Math.min((page + 1) * pageSize, totalElements)}</span> of{" "}
            <span className="font-semibold text-foreground">{totalElements}</span> results
          </div>

          <div className="flex flex-wrap items-center gap-5">
            {/* Middle: Rows per page Select */}
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground font-medium">Rows per page:</span>
              <Select
                value={String(pageSize)}
                onValueChange={(val) => {
                  setPageSize(Number(val));
                  setPage(0);
                }}
              >
                <SelectTrigger className="h-8 w-16 text-xs bg-background border border-border/40 rounded-lg font-semibold">
                  <SelectValue placeholder={String(pageSize)} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Go to Page Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const pageNum = parseInt(jumpPageInput, 10);
                if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
                  setPage(pageNum - 1);
                } else {
                  setJumpPageInput(String(page + 1));
                }
              }}
              className="flex items-center gap-1.5"
            >
              <span className="text-muted-foreground font-medium">Go to:</span>
              <Input
                type="number"
                min={1}
                max={totalPages || 1}
                value={jumpPageInput}
                onChange={(e) => setJumpPageInput(e.target.value)}
                onBlur={() => {
                  const pageNum = parseInt(jumpPageInput, 10);
                  if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
                    setPage(pageNum - 1);
                  } else {
                    setJumpPageInput(String(page + 1));
                  }
                }}
                className="h-8 w-14 text-center text-xs font-semibold bg-background border border-border/40 rounded-lg px-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                title="Nhập số trang và nhấn Enter"
              />
            </form>

            {/* Right: Numbered Pagination Buttons */}
            <div className="flex items-center gap-1">
              <Button
                disabled={page === 0}
                onClick={() => setPage((prev) => prev - 1)}
                variant="outline"
                size="sm"
                className="h-8 px-2.5 text-xs font-semibold gap-1 border-border/40 rounded-lg hover:bg-muted"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>Previous</span>
              </Button>

              {getPageNumbers(page, totalPages).map((p, pIdx) => {
                if (p === "...") {
                  return (
                    <span key={`dots-${pIdx}`} className="px-2 text-muted-foreground font-bold pointer-events-none">
                      ...
                    </span>
                  );
                }
                const pageNum = p as number;
                const isCurrent = pageNum === page;
                return (
                  <Button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    variant={isCurrent ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "h-8 min-w-[32px] px-2 text-xs font-semibold rounded-lg transition-all",
                      isCurrent
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "border-border/40 text-foreground hover:bg-muted/70"
                    )}
                  >
                    {pageNum + 1}
                  </Button>
                );
              })}

              <Button
                disabled={page >= totalPages - 1 || totalPages === 0}
                onClick={() => setPage((prev) => prev + 1)}
                variant="outline"
                size="sm"
                className="h-8 px-2.5 text-xs font-semibold gap-1 border-border/40 rounded-lg hover:bg-muted"
              >
                <span>Next</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* VIEW DEPARTMENT DETAIL MODAL */}
      {detailDeptModalOpen && viewingDept && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-2xl rounded-3xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-border flex items-center justify-between bg-muted/20">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                  <Building2 className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-foreground text-base tracking-tight">
                      {viewingDept.name}
                    </h3>
                    <span className={cn(
                      "px-2.5 py-0.5 rounded-full text-[10px] font-bold border",
                      viewingDept.status === "ACTIVE"
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                        : "bg-rose-500/10 text-rose-600 border-rose-500/20"
                    )}>
                      {viewingDept.status === "ACTIVE" ? "Đang hoạt động" : "Tạm ngưng"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    ID: <code className="font-mono text-primary font-bold">#{viewingDept.id}</code> • Mã phòng ban: <code className="font-mono text-primary font-bold">{viewingDept.code}</code>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDetailDeptModalOpen(false)}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* General Info Card */}
            <div className="p-5 border-b border-border/40 bg-card space-y-3">
              <div>
                <Label className="text-[11px] font-bold text-muted-foreground uppercase">Mô tả chức năng nhiệm vụ</Label>
                <p className="text-xs text-foreground mt-0.5 font-medium leading-relaxed">
                  {viewingDept.description || "Chưa có thông tin mô tả chi tiết cho phòng ban này."}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4 text-xs bg-muted/20 p-2.5 rounded-xl border border-border/40">
                <div>
                  <span className="text-muted-foreground font-medium">ID Phòng Ban:</span>{" "}
                  <span className="font-mono font-bold text-primary">#{viewingDept.id}</span>
                </div>
                <div>
                  <span className="text-muted-foreground font-medium">Ngày tạo:</span>{" "}
                  <span className="font-semibold text-foreground">{formatDate(viewingDept.createdAt)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground font-medium">Cập nhật lần cuối:</span>{" "}
                  <span className="font-semibold text-foreground">{formatDate(viewingDept.updatedAt)}</span>
                </div>
              </div>
            </div>

            {/* Employees Section */}
            <div className="p-5 overflow-y-auto space-y-3 flex-1">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-xs text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-primary" />
                  <span>Danh Sách Nhân Sự Phụ Trách ({deptEmployees.length})</span>
                </h4>
              </div>

              {loadingDetail ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                  <Loader2 className="h-7 w-7 text-primary animate-spin" />
                  <span className="text-xs font-semibold">Đang tải danh sách nhân viên...</span>
                </div>
              ) : deptEmployees.length > 0 ? (
                <div className="space-y-2">
                  {deptEmployees.map((emp: any) => (
                    <div key={emp.id} className="p-3 rounded-xl border border-border/60 bg-muted/20 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase">
                          {emp.fullName ? emp.fullName.charAt(0) : "E"}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-xs text-foreground">{emp.fullName || "N/A"}</p>
                            {emp.employeeCode && (
                              <span className="px-1.5 py-0.2 rounded bg-muted text-muted-foreground font-mono text-[9px]">
                                {emp.employeeCode}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                            <span><Briefcase className="inline-block h-3 w-3 mr-1" />{emp.position || "Nhân viên"}</span>
                            {emp.userEmail && <span>• {emp.userEmail}</span>}
                          </p>
                        </div>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">
                        {emp.employmentType || emp.status || "Chính thức"}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-muted-foreground border border-dashed border-border/60 rounded-2xl">
                  Chưa có nhân viên nào trực thuộc phòng ban này.
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-border bg-muted/20 flex justify-end">
              <Button onClick={() => setDetailDeptModalOpen(false)} className="h-9 text-xs font-semibold rounded-xl px-5">
                Đóng
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* DEPARTMENT CREATE/EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-lg rounded-3xl border border-border shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-border flex items-center justify-between bg-muted/20">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                <h3 className="font-extrabold text-foreground text-sm">
                  {editingDept ? `Chỉnh Sửa Phòng Ban: ${editingDept.name}` : "Thêm Phòng Ban Mới"}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDepartment} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-muted-foreground">Mã Phòng Ban</Label>
                  <Input
                    type="text"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    placeholder="Tự sinh nếu để trống (E.g. DP-1002)"
                    disabled={!!editingDept}
                    className="h-9 text-xs"
                  />
                  {editingDept && (
                    <p className="text-[10px] text-muted-foreground">Mã phòng ban không thể thay đổi sau khi tạo</p>
                  )}
                </div>

                {editingDept && (
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-muted-foreground">Trạng Thái</Label>
                    <Select value={formStatus} onValueChange={(val) => setFormStatus((val as "ACTIVE" | "INACTIVE") || "ACTIVE")}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Chọn trạng thái" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACTIVE">Đang hoạt động</SelectItem>
                        <SelectItem value="INACTIVE">Tạm ngưng</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-muted-foreground">Tên Phòng Ban *</Label>
                <Input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="E.g. Phòng Công Nghệ & Trí Tuệ Nhân Tạo"
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-muted-foreground">Mô Tả Chức Năng Nhiệm Vụ</Label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Mô tả công việc và phạm vi hoạt động của phòng ban..."
                  className="w-full h-24 p-3 rounded-xl border border-border bg-background text-xs outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="h-9 text-xs font-semibold rounded-xl" disabled={saving}>
                  Hủy
                </Button>
                <Button type="submit" className="h-9 text-xs font-bold bg-primary text-primary-foreground rounded-xl gap-1" disabled={saving}>
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Lưu Thay Đổi
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
