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
  Briefcase,
  Users,
  Clock,
  Plus,
  Search,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Calendar,
  X,
  Repeat
} from "lucide-react";

export interface WorkShiftItem {
  id: string;
  employeeCode: string;
  employeeName: string;
  departmentName: string;
  shiftType: "MORNING" | "AFTERNOON" | "FULLTIME_ADMIN" | "NIGHT";
  shiftHours: string;
  workDate: string;
  location: string;
  status: "APPROVED" | "PENDING_SWAP" | "COMPLETED";
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

export const WorkScheduleManagement: React.FC = () => {
  const [shifts, setShifts] = useState<WorkShiftItem[]>([
    {
      id: "wsh-1",
      employeeCode: "EMP-FULL-01",
      employeeName: "Vũ Tiến Đạt",
      departmentName: "Phòng Công Nghệ & AI",
      shiftType: "FULLTIME_ADMIN",
      shiftHours: "08:00 - 17:00 (Nghỉ trưa 12:00 - 13:00)",
      workDate: "2026-07-27",
      location: "Trụ sở chính (Tầng 8, AILMS Building)",
      status: "APPROVED",
    },
    {
      id: "wsh-2",
      employeeCode: "EMP-FULL-02",
      employeeName: "Nguyễn Thị Mai",
      departmentName: "Phòng Hành Chính Nhân Sự",
      shiftType: "FULLTIME_ADMIN",
      shiftHours: "08:00 - 17:00 (Nghỉ trưa 12:00 - 13:00)",
      workDate: "2026-07-27",
      location: "Trụ sở chính (Tầng 8, AILMS Building)",
      status: "APPROVED",
    },
    {
      id: "wsh-3",
      employeeCode: "EMP-PART-03",
      employeeName: "Lê Minh Triết",
      departmentName: "Phòng Đào Tạo & Giảng Viên",
      shiftType: "AFTERNOON",
      shiftHours: "13:30 - 17:30",
      workDate: "2026-07-27",
      location: "Trụ sở chính (Tầng 6)",
      status: "PENDING_SWAP",
    },
    {
      id: "wsh-4",
      employeeCode: "EMP-FULL-04",
      employeeName: "Trần Bảo Nam",
      departmentName: "Phòng Marketing",
      shiftType: "FULLTIME_ADMIN",
      shiftHours: "08:00 - 17:00 (Nghỉ trưa 12:00 - 13:00)",
      workDate: "2026-07-27",
      location: "Trụ sở chính (Tầng 7)",
      status: "APPROVED",
    },
  ]);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState("");
  const [shiftTypeFilter, setShiftTypeFilter] = useState("ALL");

  // Pagination
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [jumpPageInput, setJumpPageInput] = useState<string>("1");

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<WorkShiftItem | null>(null);

  // Form State
  const [formEmployeeCode, setFormEmployeeCode] = useState("EMP-FULL-01");
  const [formEmployeeName, setFormEmployeeName] = useState("");
  const [formDepartmentName, setFormDepartmentName] = useState("Phòng Công Nghệ & AI");
  const [formShiftType, setFormShiftType] = useState<WorkShiftItem["shiftType"]>("FULLTIME_ADMIN");
  const [formShiftHours, setFormShiftHours] = useState("08:00 - 17:00");
  const [formWorkDate, setFormWorkDate] = useState("2026-07-27");
  const [formLocation, setFormLocation] = useState("Trụ sở chính (Tầng 8)");
  const [formStatus, setFormStatus] = useState<WorkShiftItem["status"]>("APPROVED");

  useEffect(() => {
    setJumpPageInput(String(page + 1));
  }, [page]);

  const handleOpenModal = (sh?: WorkShiftItem) => {
    if (sh) {
      setEditingShift(sh);
      setFormEmployeeCode(sh.employeeCode);
      setFormEmployeeName(sh.employeeName);
      setFormDepartmentName(sh.departmentName);
      setFormShiftType(sh.shiftType);
      setFormShiftHours(sh.shiftHours);
      setFormWorkDate(sh.workDate);
      setFormLocation(sh.location);
      setFormStatus(sh.status);
    } else {
      setEditingShift(null);
      setFormEmployeeCode(`EMP-FULL-0${Math.floor(1 + Math.random() * 9)}`);
      setFormEmployeeName("");
      setFormDepartmentName("Phòng Công Nghệ & AI");
      setFormShiftType("FULLTIME_ADMIN");
      setFormShiftHours("08:00 - 17:00");
      setFormWorkDate("2026-07-27");
      setFormLocation("Trụ sở chính (Tầng 8)");
      setFormStatus("APPROVED");
    }
    setIsModalOpen(true);
  };

  const handleSaveShift = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formEmployeeName.trim()) {
      alert("Vui lòng nhập tên nhân viên!");
      return;
    }

    if (editingShift) {
      setShifts((prev) =>
        prev.map((s) =>
          s.id === editingShift.id
            ? {
                ...s,
                employeeCode: formEmployeeCode,
                employeeName: formEmployeeName,
                departmentName: formDepartmentName,
                shiftType: formShiftType,
                shiftHours: formShiftHours,
                workDate: formWorkDate,
                location: formLocation,
                status: formStatus,
              }
            : s
        )
      );
      alert(`Cập nhật ca làm việc của ${formEmployeeName} thành công!`);
    } else {
      const newShift: WorkShiftItem = {
        id: `wsh-${Date.now()}`,
        employeeCode: formEmployeeCode,
        employeeName: formEmployeeName,
        departmentName: formDepartmentName,
        shiftType: formShiftType,
        shiftHours: formShiftHours,
        workDate: formWorkDate,
        location: formLocation,
        status: formStatus,
      };
      setShifts((prev) => [newShift, ...prev]);
      alert(`Phân ca làm việc mới cho ${formEmployeeName} thành công!`);
    }
    setIsModalOpen(false);
  };

  const handleDeleteShift = (id: string, name: string) => {
    if (confirm(`Bạn có chắc muốn xóa lịch làm việc của nhân viên "${name}"?`)) {
      setShifts((prev) => prev.filter((s) => s.id !== id));
      alert("Đã xóa ca làm việc thành công.");
    }
  };

  const filteredShifts = shifts.filter((s) => {
    const matchesSearch =
      s.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.employeeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.departmentName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = shiftTypeFilter === "ALL" ? true : s.shiftType === shiftTypeFilter;
    return matchesSearch && matchesType;
  });

  const totalElements = filteredShifts.length;
  const totalPages = Math.ceil(totalElements / pageSize);
  const paginatedShifts = filteredShifts.slice(
    page * pageSize,
    (page + 1) * pageSize
  );

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 space-y-6 animate-in fade-in duration-300">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-primary" />
            <span>Quản Lý Lịch Làm Việc & Phân Ca (Work Schedule Management)</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Quản lý ca làm việc cho Nhân viên Full-time (Hành chính 08:00 - 17:00), Part-time & Duyệt đăng ký đổi ca.
          </p>
        </div>
        <Button onClick={() => handleOpenModal()} className="rounded-xl font-bold text-xs bg-primary text-primary-foreground gap-1">
          <Plus className="h-4 w-4" /> Phân Ca Làm Việc Mới
        </Button>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border border-border/80 bg-card rounded-2xl flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/10 text-primary">
            <Briefcase className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase">Tổng Số Ca Trong Ngày</p>
            <p className="text-xl font-extrabold text-foreground">{shifts.length} Ca</p>
          </div>
        </Card>

        <Card className="p-4 border border-border/80 bg-card rounded-2xl flex items-center gap-3">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase">Ca Đã Phê Duyệt</p>
            <p className="text-xl font-extrabold text-foreground">
              {shifts.filter((s) => s.status === "APPROVED").length} Ca
            </p>
          </div>
        </Card>

        <Card className="p-4 border border-amber-500/30 bg-amber-500/5 rounded-2xl flex items-center gap-3">
          <div className="p-3 rounded-xl bg-amber-500/20 text-amber-600">
            <Repeat className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-amber-600 uppercase">Yêu Cầu Đổi Ca Chờ Duyệt</p>
            <p className="text-xl font-extrabold text-amber-600">
              {shifts.filter((s) => s.status === "PENDING_SWAP").length} Yêu cầu
            </p>
          </div>
        </Card>

        <Card className="p-4 border border-border/80 bg-card rounded-2xl flex items-center gap-3">
          <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-600">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase">Nhân Viên Tham Gia</p>
            <p className="text-xl font-extrabold text-foreground">
              {new Set(shifts.map((s) => s.employeeCode)).size} Nhân viên
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
                placeholder="Tìm theo Mã NV, Tên nhân viên hoặc Phòng ban..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
                className="pl-8 h-9 text-xs border border-border bg-background rounded-lg focus-visible:ring-2 focus-visible:ring-primary/20"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1 lg:col-span-4">
            <Label className="text-[11px] font-bold text-muted-foreground">Loại ca làm việc</Label>
            <Select value={shiftTypeFilter} onValueChange={(val) => { setShiftTypeFilter(val || "ALL"); setPage(0); }}>
              <SelectTrigger className="h-9 text-xs bg-background border border-border rounded-lg font-semibold">
                <SelectValue placeholder="Tất cả ca làm" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả ca làm</SelectItem>
                <SelectItem value="FULLTIME_ADMIN">Fulltime Hành Chính (08:00 - 17:00)</SelectItem>
                <SelectItem value="MORNING">Ca Sáng (08:00 - 12:00)</SelectItem>
                <SelectItem value="AFTERNOON">Ca Chiều (13:30 - 17:30)</SelectItem>
                <SelectItem value="NIGHT">Ca Tối / Đêm</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table Content */}
        <CardContent className="p-0 relative">
          <Table containerClassName="max-h-[calc(100vh-320px)] min-h-[350px] overflow-auto border-b border-border/20" className="-mt-3 pb-4">
            <TableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur-md shadow-2xs border-b border-border/40">
              <TableRow className="border-b border-border/30 bg-muted/20 hover:bg-muted/20">
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-4">Mã NV & Nhân Viên</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Phòng Ban</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Loại Ca Làm Việc</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Khung Giờ Ca Làm</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ngày Làm Việc</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Trạng Thái</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right pr-4">Thao Tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="opacity-90">
              {paginatedShifts.length > 0 ? (
                paginatedShifts.map((sh) => (
                  <TableRow key={sh.id} className="hover:bg-foreground/10 transition-colors border-border/30">
                    <TableCell className="pl-4">
                      <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-bold font-mono text-[10px] border border-primary/20">
                        {sh.employeeCode}
                      </span>
                      <div className="font-semibold text-xs text-foreground mt-0.5">{sh.employeeName}</div>
                    </TableCell>
                    <TableCell className="font-semibold text-xs text-foreground">{sh.departmentName}</TableCell>
                    <TableCell>
                      <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 font-extrabold text-[10px] border border-indigo-500/20">
                        {sh.shiftType === "FULLTIME_ADMIN" ? "Fulltime Hành Chính" : sh.shiftType}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-xs font-semibold text-foreground">
                        <Clock className="h-3.5 w-3.5 text-primary" />
                        <span>{sh.shiftHours}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground">{sh.location}</div>
                    </TableCell>
                    <TableCell className="font-semibold text-xs text-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{sh.workDate}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {sh.status === "APPROVED" && (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-bold border border-emerald-500/20">
                          Đã phê duyệt
                        </span>
                      )}
                      {sh.status === "PENDING_SWAP" && (
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 text-[10px] font-bold border border-amber-500/20">
                          Chờ duyệt đổi ca
                        </span>
                      )}
                      {sh.status === "COMPLETED" && (
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-500/10 text-slate-600 text-[10px] font-bold border border-slate-500/20">
                          Hoàn tất
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right pr-4">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          onClick={() => handleOpenModal(sh)}
                          variant="ghost"
                          size="icon"
                          title="Chỉnh sửa"
                          className="h-7 w-7 text-muted-foreground hover:bg-muted"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          onClick={() => handleDeleteShift(sh.id, sh.employeeName)}
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
                  <TableCell colSpan={7} className="py-12 text-center text-muted-foreground text-sm">
                    Không tìm thấy ca làm việc nào phù hợp.
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

      {/* SHIFT EDIT/CREATE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-lg rounded-3xl border border-border shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-border flex items-center justify-between bg-muted/20">
              <div className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" />
                <h3 className="font-extrabold text-foreground text-sm">
                  {editingShift ? `Chỉnh Sửa Ca Làm: ${editingShift.employeeName}` : "Phân Ca Làm Việc Mới"}
                </h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-lg hover:bg-muted text-muted-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveShift} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-muted-foreground">Mã Nhân Viên</Label>
                  <Input
                    type="text"
                    value={formEmployeeCode}
                    onChange={(e) => setFormEmployeeCode(e.target.value)}
                    placeholder="E.g. EMP-FULL-01"
                    className="h-9 text-xs font-mono"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-muted-foreground">Tên Nhân Viên</Label>
                  <Input
                    type="text"
                    value={formEmployeeName}
                    onChange={(e) => setFormEmployeeName(e.target.value)}
                    placeholder="E.g. Vũ Tiến Đạt"
                    className="h-9 text-xs"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-muted-foreground">Phòng Ban Phụ Trách</Label>
                <Input
                  type="text"
                  value={formDepartmentName}
                  onChange={(e) => setFormDepartmentName(e.target.value)}
                  placeholder="E.g. Phòng Công Nghệ & AI"
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-muted-foreground">Loại Ca Làm</Label>
                  <Select value={formShiftType} onValueChange={(val) => setFormShiftType((val as any) || "FULLTIME_ADMIN")}>
                    <SelectTrigger className="h-9 text-xs font-semibold">
                      <SelectValue placeholder="Chọn ca" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FULLTIME_ADMIN">Fulltime Hành Chính</SelectItem>
                      <SelectItem value="MORNING">Ca Sáng</SelectItem>
                      <SelectItem value="AFTERNOON">Ca Chiều</SelectItem>
                      <SelectItem value="NIGHT">Ca Đêm</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-muted-foreground">Ngày Làm Việc</Label>
                  <Input
                    type="date"
                    value={formWorkDate}
                    onChange={(e) => setFormWorkDate(e.target.value)}
                    className="h-9 text-xs"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-muted-foreground">Khung Giờ Ca Làm</Label>
                <Input
                  type="text"
                  value={formShiftHours}
                  onChange={(e) => setFormShiftHours(e.target.value)}
                  placeholder="E.g. 08:00 - 17:00 (Nghỉ trưa 12:00 - 13:00)"
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-muted-foreground">Địa Điểm Làm Việc</Label>
                <Input
                  type="text"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  placeholder="E.g. Trụ sở chính (Tầng 8)"
                  className="h-9 text-xs"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="h-9 text-xs font-semibold rounded-xl">
                  Hủy
                </Button>
                <Button type="submit" className="h-9 text-xs font-bold bg-primary text-primary-foreground rounded-xl">
                  Lưu Ca Làm Việc
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
