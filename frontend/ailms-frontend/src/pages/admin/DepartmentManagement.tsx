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
  Building2,
  Users,
  UserCheck,
  Plus,
  Search,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
  CheckCircle2
} from "lucide-react";

export interface DepartmentItem {
  id: string;
  code: string;
  name: string;
  managerName: string;
  managerEmail: string;
  employeeCount: number;
  description: string;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
}

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
  const [departments, setDepartments] = useState<DepartmentItem[]>([
    {
      id: "dept-1",
      code: "DEPT-AI-01",
      name: "Phòng Công Nghệ & Trí Tuệ Nhân Tạo (AI & Tech)",
      managerName: "Vũ Tiến Đạt",
      managerEmail: "dat.vt@ailms.edu.vn",
      employeeCount: 14,
      description: "Nghiên cứu & Phát triển các mô hình AI Personalized Learning, hạ tầng Cloud LMS và Hệ thống Recommender.",
      status: "ACTIVE",
      createdAt: "2026-01-15",
    },
    {
      id: "dept-2",
      code: "DEPT-EDU-02",
      name: "Phòng Đào Tạo & Quản Lý Giảng Viên (Academic & Faculty)",
      managerName: "Lê Minh Triết",
      managerEmail: "triet.lm@outlook.com",
      employeeCount: 28,
      description: "Quản lý chương trình học, phân công Giảng viên/Trợ giảng và kiếm định chất lượng đề thi.",
      status: "ACTIVE",
      createdAt: "2026-02-01",
    },
    {
      id: "dept-3",
      code: "DEPT-HR-03",
      name: "Phòng Hành Chính Nhân Sự & Pháp Lý (HR & Legal)",
      managerName: "Nguyễn Thị Mai",
      managerEmail: "mai.nt@ailms.edu.vn",
      employeeCount: 8,
      description: "Soạn thảo hợp đồng lao động MinIO, chấm công tự động, tuyển dụng và chế độ chính sách đãi ngộ.",
      status: "ACTIVE",
      createdAt: "2026-02-10",
    },
    {
      id: "dept-4",
      code: "DEPT-MKT-04",
      name: "Phòng Marketing & Phát Triển Thị Trường",
      managerName: "Trần Bảo Nam",
      managerEmail: "nam.tb@ailms.edu.vn",
      employeeCount: 12,
      description: "Chiến dịch truyền thông, phát hành Mã giảm giá (Coupon), quản lý cộng đồng học viên.",
      status: "ACTIVE",
      createdAt: "2026-03-05",
    },
    {
      id: "dept-5",
      code: "DEPT-CS-05",
      name: "Phòng Chăm Sóc Học Viên & Hỗ Trợ Kỹ Thuật (Customer Success)",
      managerName: "Võ Văn Hải",
      managerEmail: "hai.vo@ailms.edu.vn",
      employeeCount: 10,
      description: "Tiếp nhận feedback khóa học, giải quyết khiếu nại hoàn tiền (Refund) và hỗ trợ tài khoản.",
      status: "INACTIVE",
      createdAt: "2026-04-12",
    },
  ]);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Pagination
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [jumpPageInput, setJumpPageInput] = useState<string>("1");

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<DepartmentItem | null>(null);

  // Form State
  const [formCode, setFormCode] = useState("");
  const [formName, setFormName] = useState("");
  const [formManagerName, setFormManagerName] = useState("");
  const [formManagerEmail, setFormManagerEmail] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formStatus, setFormStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");

  useEffect(() => {
    setJumpPageInput(String(page + 1));
  }, [page]);

  const handleOpenModal = (dept?: DepartmentItem) => {
    if (dept) {
      setEditingDept(dept);
      setFormCode(dept.code);
      setFormName(dept.name);
      setFormManagerName(dept.managerName);
      setFormManagerEmail(dept.managerEmail);
      setFormDescription(dept.description);
      setFormStatus(dept.status);
    } else {
      setEditingDept(null);
      setFormCode(`DEPT-${Math.floor(10 + Math.random() * 90)}`);
      setFormName("");
      setFormManagerName("");
      setFormManagerEmail("");
      setFormDescription("");
      setFormStatus("ACTIVE");
    }
    setIsModalOpen(true);
  };

  const handleSaveDepartment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert("Vui lòng nhập tên phòng ban!");
      return;
    }

    if (editingDept) {
      setDepartments((prev) =>
        prev.map((d) =>
          d.id === editingDept.id
            ? {
                ...d,
                code: formCode,
                name: formName,
                managerName: formManagerName,
                managerEmail: formManagerEmail,
                description: formDescription,
                status: formStatus,
              }
            : d
        )
      );
      alert(`Cập nhật phòng ban ${formName} thành công!`);
    } else {
      const newDept: DepartmentItem = {
        id: `dept-${Date.now()}`,
        code: formCode || `DEPT-${Date.now()}`,
        name: formName,
        managerName: formManagerName || "Chưa phân công",
        managerEmail: formManagerEmail || "N/A",
        employeeCount: 0,
        description: formDescription,
        status: formStatus,
        createdAt: new Date().toISOString().split("T")[0],
      };
      setDepartments((prev) => [newDept, ...prev]);
      alert(`Tạo mới phòng ban ${formName} thành công!`);
    }
    setIsModalOpen(false);
  };

  const handleDeleteDepartment = (id: string, name: string) => {
    if (confirm(`Bạn có chắc chắn muốn xóa phòng ban "${name}"?`)) {
      setDepartments((prev) => prev.filter((d) => d.id !== id));
      alert(`Đã xóa phòng ban ${name} thành công!`);
    }
  };

  const filteredDepartments = departments.filter((d) => {
    const matchesSearch =
      d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.managerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.managerEmail.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "ALL" ? true : d.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const totalElements = filteredDepartments.length;
  const totalPages = Math.ceil(totalElements / pageSize);
  const paginatedDepartments = filteredDepartments.slice(
    page * pageSize,
    (page + 1) * pageSize
  );

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 space-y-6 animate-in fade-in duration-300">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            <span>Quản Lý Phòng Ban (Department Management)</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Quản lý sơ đồ tổ chức, Trưởng phòng phụ trách và định biên nhân sự theo từng bộ phận.
          </p>
        </div>
        <Button onClick={() => handleOpenModal()} className="rounded-xl font-bold text-xs bg-primary text-primary-foreground gap-1">
          <Plus className="h-4 w-4" /> Thêm Phòng Ban Mới
        </Button>
      </div>

      {/* KPI Cards Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border border-border/80 bg-card rounded-2xl flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/10 text-primary">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase">Tổng Số Phòng Ban</p>
            <p className="text-xl font-extrabold text-foreground">{departments.length}</p>
          </div>
        </Card>

        <Card className="p-4 border border-border/80 bg-card rounded-2xl flex items-center gap-3">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase">Đang Hoạt Động</p>
            <p className="text-xl font-extrabold text-foreground">
              {departments.filter((d) => d.status === "ACTIVE").length}
            </p>
          </div>
        </Card>

        <Card className="p-4 border border-border/80 bg-card rounded-2xl flex items-center gap-3">
          <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-600">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase">Tổng Định Biên Nhân Sự</p>
            <p className="text-xl font-extrabold text-foreground">
              {departments.reduce((acc, cur) => acc + cur.employeeCount, 0)} Nhân viên
            </p>
          </div>
        </Card>

        <Card className="p-4 border border-border/80 bg-card rounded-2xl flex items-center gap-3">
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-600">
            <UserCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase">Trưởng Phòng Đã Gán</p>
            <p className="text-xl font-extrabold text-foreground">
              {departments.filter((d) => d.managerEmail !== "N/A").length}
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
                placeholder="Tìm theo Mã PB, Tên phòng ban, Tên hoặc Email Trưởng phòng..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
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
          <Table containerClassName="max-h-[calc(100vh-320px)] min-h-[350px] overflow-auto border-b border-border/20" className="-mt-3 pb-4">
            <TableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur-md shadow-2xs border-b border-border/40">
              <TableRow className="border-b border-border/30 bg-muted/20 hover:bg-muted/20">
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-4">Mã Phòng Ban</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tên Phòng Ban & Mô Tả</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Trưởng Phòng Phụ Trách</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Số Nhân Sự</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Trạng Thái</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right pr-4">Hành Động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="opacity-90">
              {paginatedDepartments.length > 0 ? (
                paginatedDepartments.map((dept) => (
                  <TableRow key={dept.id} className="hover:bg-foreground/10 transition-colors border-border/30">
                    <TableCell className="font-mono font-bold text-xs text-primary pl-4">
                      <span className="px-2.5 py-0.5 rounded-lg bg-primary/10 border border-primary/20">
                        {dept.code}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-xs text-foreground max-w-sm">{dept.name}</div>
                      <div className="text-[10px] text-muted-foreground line-clamp-1 max-w-sm mt-0.5">{dept.description}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-xs text-foreground">{dept.managerName}</div>
                      <div className="text-[10px] text-muted-foreground">{dept.managerEmail}</div>
                    </TableCell>
                    <TableCell>
                      <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 font-extrabold text-[10px] border border-indigo-500/20">
                        {dept.employeeCount} nhân sự
                      </span>
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
                  <TableCell colSpan={6} className="py-12 text-center text-muted-foreground text-sm">
                    Không tìm thấy phòng ban nào phù hợp.
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

      {/* DEPARTMENT MODAL */}
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
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-lg hover:bg-muted text-muted-foreground">
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
                    placeholder="E.g. DEPT-AI-01"
                    className="h-9 text-xs"
                    required
                  />
                </div>

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
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-muted-foreground">Tên Phòng Ban</Label>
                <Input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="E.g. Phòng Công Nghệ & Trí Tuệ Nhân Tạo"
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-muted-foreground">Trưởng Phòng Phụ Trách</Label>
                  <Input
                    type="text"
                    value={formManagerName}
                    onChange={(e) => setFormManagerName(e.target.value)}
                    placeholder="E.g. Vũ Tiến Đạt"
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-muted-foreground">Email Trưởng Phòng</Label>
                  <Input
                    type="email"
                    value={formManagerEmail}
                    onChange={(e) => setFormManagerEmail(e.target.value)}
                    placeholder="E.g. dat.vt@ailms.edu.vn"
                    className="h-9 text-xs"
                  />
                </div>
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
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="h-9 text-xs font-semibold rounded-xl">
                  Hủy
                </Button>
                <Button type="submit" className="h-9 text-xs font-bold bg-primary text-primary-foreground rounded-xl">
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
