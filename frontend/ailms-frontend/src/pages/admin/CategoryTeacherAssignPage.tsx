import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
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
  UserPlus,
  Trash2,
  AlertTriangle,
  Search,
  X,
  BookOpen,
  FolderTree,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export interface CategoryTeacher {
  id: string;
  categoryId: string;
  categoryName: string;
  teacherId: string;
  teacherCode: string;
  teacherName: string;
  teacherEmail: string;
  position: "TEACHER" | "TA";
  status: "ACTIVE" | "INACTIVE";
  assignedAt: string;
  activeCourseCount?: number;
  activeCourses?: string[];
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

export const CategoryTeacherAssignPage: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState({
    id: "cat-1",
    name: "Lập trình Web & Frontend Frameworks",
  });

  const [searchTeacher, setSearchTeacher] = useState("");
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [unassignWarningModal, setUnassignWarningModal] = useState<CategoryTeacher | null>(null);

  // Pagination
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [jumpPageInput, setJumpPageInput] = useState<string>("1");

  useEffect(() => {
    setJumpPageInput(String(page + 1));
  }, [page]);

  const [assignedTeachers, setAssignedTeachers] = useState<CategoryTeacher[]>([
    {
      id: "tc-1",
      categoryId: "cat-1",
      categoryName: "Lập trình Web & Frontend Frameworks",
      teacherId: "emp-2",
      teacherCode: "EP-2607-F88B12",
      teacherName: "Lê Minh Triết",
      teacherEmail: "triet.lm@outlook.com",
      position: "TEACHER",
      status: "ACTIVE",
      assignedAt: "2026-06-01",
      activeCourseCount: 2,
      activeCourses: [
        "Lập trình ReactJS & NextJS Chuyên Sâu",
        "Frontend Realtime WebSockets",
      ],
    },
    {
      id: "tc-2",
      categoryId: "cat-1",
      categoryName: "Lập trình Web & Frontend Frameworks",
      teacherId: "emp-3",
      teacherCode: "EP-2607-C3D4E5",
      teacherName: "Võ Văn Hải",
      teacherEmail: "hai.vo@ailms.edu.vn",
      position: "TA",
      status: "ACTIVE",
      assignedAt: "2026-07-10",
      activeCourseCount: 0,
      activeCourses: [],
    },
  ]);

  const AVAILABLE_TEACHERS = [
    {
      id: "emp-4",
      code: "EP-2607-G99A00",
      name: "Nguyễn Hoàng Nam",
      email: "nam.nh@ailms.edu.vn",
      position: "TEACHER" as const,
      isAlreadyAssigned: false,
    },
    {
      id: "emp-2",
      code: "EP-2607-F88B12",
      name: "Lê Minh Triết",
      email: "triet.lm@outlook.com",
      position: "TEACHER" as const,
      isAlreadyAssigned: true,
    },
  ];

  const handleUnassignClick = (tc: CategoryTeacher) => {
    if (tc.activeCourseCount && tc.activeCourseCount > 0) {
      setUnassignWarningModal(tc);
      return;
    }

    if (confirm(`Xác nhận hủy gán giảng viên ${tc.teacherName} khỏi danh mục ${selectedCategory.name}?`)) {
      setAssignedTeachers((prev) => prev.filter((t) => t.id !== tc.id));
      alert("Đã hủy gán giảng viên thành công!");
    }
  };

  const handleAssignTeacher = (emp: typeof AVAILABLE_TEACHERS[0]) => {
    const newAssignment: CategoryTeacher = {
      id: `tc-${Date.now()}`,
      categoryId: selectedCategory.id,
      categoryName: selectedCategory.name,
      teacherId: emp.id,
      teacherCode: emp.code,
      teacherName: emp.name,
      teacherEmail: emp.email,
      position: emp.position,
      status: "ACTIVE",
      assignedAt: new Date().toISOString().split("T")[0],
      activeCourseCount: 0,
      activeCourses: [],
    };

    setAssignedTeachers((prev) => [...prev, newAssignment]);
    alert(`Đã gán giảng viên ${emp.name} vào lĩnh vực ${selectedCategory.name} thành công!`);
    setIsAssignModalOpen(false);
  };

  const filteredTeachers = assignedTeachers.filter((tc) =>
    tc.teacherName.toLowerCase().includes(searchTeacher.toLowerCase()) ||
    tc.teacherEmail.toLowerCase().includes(searchTeacher.toLowerCase()) ||
    tc.teacherCode.toLowerCase().includes(searchTeacher.toLowerCase())
  );

  const totalElements = filteredTeachers.length;
  const totalPages = Math.ceil(totalElements / pageSize);
  const paginatedTeachers = filteredTeachers.slice(page * pageSize, (page + 1) * pageSize);

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 space-y-6 animate-in fade-in duration-300">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
            <FolderTree className="h-6 w-6 text-primary" />
            <span>Phân Công Giảng Viên Theo Lĩnh Vực (Teacher Categories)</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Quản lý danh sách Giáo viên & Trợ giảng được phép tạo khóa học và đứng lớp theo từng danh mục.
          </p>
        </div>
        <Button onClick={() => setIsAssignModalOpen(true)} className="rounded-xl font-bold text-xs bg-primary text-primary-foreground gap-1">
          <UserPlus className="h-4 w-4" /> Gán Giảng Viên Vào Lĩnh Vực
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Sidebar: Categories List */}
        <div className="md:col-span-4 space-y-2">
          <h3 className="text-xs font-extrabold uppercase text-muted-foreground tracking-wider px-1">
            Danh Mục Lĩnh Vực:
          </h3>
          {[
            { id: "cat-1", name: "Lập trình Web & Frontend Frameworks", count: 2 },
            { id: "cat-2", name: "Trí tuệ nhân tạo (AI & Machine Learning)", count: 3 },
            { id: "cat-3", name: "Khoa học dữ liệu (Data Science)", count: 1 },
            { id: "cat-4", name: "Thiết kế UI/UX & Product Design", count: 2 },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => { setSelectedCategory(cat); setPage(0); }}
              className={`w-full p-4 rounded-2xl border text-left flex items-center justify-between transition-all ${
                selectedCategory.id === cat.id
                  ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                  : "border-border/80 bg-card hover:border-primary/40"
              }`}
            >
              <div>
                <h4 className="font-bold text-xs text-foreground">{cat.name}</h4>
                <p className="text-[10px] text-muted-foreground mt-0.5">{cat.count} Giảng viên đang gán</p>
              </div>
              <BookOpen className="h-4 w-4 text-primary" />
            </button>
          ))}
        </div>

        {/* Right Panel: Assigned Teachers List */}
        <div className="md:col-span-8 space-y-4">
          <div className="flex justify-between items-center bg-card p-4 rounded-2xl border border-border">
            <div>
              <h3 className="font-extrabold text-foreground text-sm">{selectedCategory.name}</h3>
              <p className="text-xs text-muted-foreground">Danh sách Giảng viên / Trợ giảng có quyền đứng lớp thuộc danh mục này</p>
            </div>
          </div>

          <Card className="border border-border/80 rounded-2xl overflow-hidden bg-card shadow-sm">
            {/* Search & Toolbar */}
            <div className="p-4 bg-muted/20 border-b border-border/30 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-12 gap-3 items-end">
              <div className="flex flex-col gap-1 lg:col-span-12">
                <Label className="text-[11px] font-bold text-muted-foreground">Từ khóa tìm kiếm</Label>
                <div className="relative w-full">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    type="text"
                    placeholder="Tìm theo Tên, Email hoặc Mã GV..."
                    value={searchTeacher}
                    onChange={(e) => setSearchTeacher(e.target.value)}
                    className="pl-8 h-9 text-xs border border-border bg-background rounded-lg focus-visible:ring-2 focus-visible:ring-primary/20"
                  />
                </div>
              </div>
            </div>

            {/* Table Content */}
            <CardContent className="p-0 relative">
              <Table containerClassName="max-h-[calc(100vh-320px)] min-h-[350px] overflow-auto border-b border-border/20" className="-mt-3 pb-4">
                <TableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur-md shadow-2xs border-b border-border/40">
                  <TableRow className="border-b border-border/30 bg-muted/20 hover:bg-muted/20">
                    <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-4">Mã NV</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Giảng Viên</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Vai Trò</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Trạng Thái</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Khóa Học Đang Phụ Trách</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right pr-4">Hành Động</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="opacity-90">
                  {paginatedTeachers.length > 0 ? (
                    paginatedTeachers.map((tc) => (
                      <TableRow key={tc.id} className="hover:bg-foreground/10 transition-colors border-border/30">
                        <TableCell className="font-mono font-bold text-xs text-primary pl-4">{tc.teacherCode}</TableCell>
                        <TableCell>
                          <div className="font-semibold text-xs text-foreground">{tc.teacherName}</div>
                          <div className="text-[10px] text-muted-foreground">{tc.teacherEmail}</div>
                        </TableCell>
                        <TableCell>
                          <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 font-extrabold text-[10px] border border-indigo-500/20">
                            {tc.position}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-bold text-[10px] border border-emerald-500/20">
                            Đang hoạt động
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs font-semibold">
                          {tc.activeCourseCount && tc.activeCourseCount > 0 ? (
                            <span className="text-primary font-extrabold">{tc.activeCourseCount} Khóa học đang bán</span>
                          ) : (
                            "Chưa có khóa học"
                          )}
                        </TableCell>
                        <TableCell className="text-right pr-4">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleUnassignClick(tc)}
                            className="h-7 text-xs font-semibold text-rose-600 hover:bg-rose-500/10 gap-1"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Hủy gán
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="py-12 text-center text-muted-foreground text-sm">
                        Không có giảng viên nào phù hợp.
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
                      <SelectItem value="100">100</SelectItem>
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
        </div>
      </div>

      {/* WARNING MODAL WHEN UNASSIGNING TEACHER WITH ACTIVE COURSES */}
      {unassignWarningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-md rounded-3xl border border-border shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-border flex items-center justify-between bg-rose-500/10">
              <div className="flex items-center gap-2 text-rose-600">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <h3 className="font-extrabold text-sm">Không Thể Hủy Gán Giảng Viên</h3>
              </div>
              <button onClick={() => setUnassignWarningModal(null)} className="p-1 rounded-lg hover:bg-muted text-muted-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <p className="text-foreground font-medium leading-relaxed">
                Giảng viên <strong className="text-primary font-extrabold">{unassignWarningModal.teacherName}</strong> hiện đang phụ trách các khóa học ACTIVE trong danh mục này. Vui lòng đổi giảng viên phụ trách khóa học trước khi hủy gán.
              </p>

              <div className="p-3.5 rounded-xl bg-muted/40 border border-border space-y-2">
                <span className="text-[10px] font-extrabold uppercase text-muted-foreground block">
                  Danh sách khóa học đang phụ trách ({unassignWarningModal.activeCourseCount}):
                </span>
                {unassignWarningModal.activeCourses?.map((c, idx) => (
                  <div key={idx} className="flex items-center gap-2 font-bold text-foreground">
                    <BookOpen className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span>{c}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2 flex justify-end">
                <Button onClick={() => setUnassignWarningModal(null)} className="rounded-xl font-bold bg-primary">
                  Đã hiểu & Đóng
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ASSIGN TEACHER MODAL */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-lg rounded-3xl border border-border shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-border flex items-center justify-between bg-muted/20">
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" />
                <h3 className="font-extrabold text-foreground text-sm">Gán Giảng Viên Vào {selectedCategory.name}</h3>
              </div>
              <button onClick={() => setIsAssignModalOpen(false)} className="p-1 rounded-lg hover:bg-muted text-muted-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="relative">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Tìm giảng viên theo Tên, Mã NV..."
                  value={searchTeacher}
                  onChange={(e) => setSearchTeacher(e.target.value)}
                  className="pl-10 rounded-xl"
                />
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {AVAILABLE_TEACHERS.map((emp) => (
                  <div
                    key={emp.id}
                    className={`p-3.5 rounded-xl border flex items-center justify-between ${
                      emp.isAlreadyAssigned ? "bg-muted/30 border-border/60 opacity-70" : "bg-card border-border"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-extrabold text-primary">{emp.code}</span>
                        <h4 className="font-bold text-foreground">{emp.name}</h4>
                      </div>
                      <p className="text-[10px] text-muted-foreground">{emp.email}</p>
                    </div>

                    {emp.isAlreadyAssigned ? (
                      <span className="text-[10px] font-extrabold text-amber-600 bg-amber-500/10 px-2.5 py-1 rounded-lg">
                        Đã được gán
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleAssignTeacher(emp)}
                        className="rounded-xl font-bold bg-primary text-xs"
                      >
                        Gán giảng viên
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
