import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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
  FileCode2,
  Plus,
  Search,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  X,
  GraduationCap,
  Paperclip
} from "lucide-react";

export interface AssignmentItem {
  id: string;
  title: string;
  courseName: string;
  deadline: string;
  fileTypesAllowed: string;
  maxScore: number;
  totalSubmissions: number;
  pendingGradingCount: number;
  status: "OPEN" | "CLOSED" | "DRAFT";
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

export const AssignmentManagement: React.FC = () => {
  const [assignments, setAssignments] = useState<AssignmentItem[]>([
    {
      id: "asg-201",
      title: "Đồ Án Cuối Khóa: Xây Dựng Ứng Dụng E-Commerce Fullstack Next.js 14",
      courseName: "Lập trình ReactJS & NextJS Chuyên Sâu",
      deadline: "2026-08-15 23:59",
      fileTypesAllowed: "ZIP, PDF, GitHub Repo Link",
      maxScore: 100,
      totalSubmissions: 34,
      pendingGradingCount: 12,
      status: "OPEN",
      createdAt: "2026-07-01",
    },
    {
      id: "asg-202",
      title: "Bài Thực Hành 3: Fine-Tuning Llama 3 Model với LoRA trên Dataset Custom",
      courseName: "Trí Tuệ Nhân Tạo & LLM Production",
      deadline: "2026-08-05 23:59",
      fileTypesAllowed: "Jupyter Notebook (.ipynb), PDF",
      maxScore: 100,
      totalSubmissions: 48,
      pendingGradingCount: 5,
      status: "OPEN",
      createdAt: "2026-07-10",
    },
    {
      id: "asg-203",
      title: "Assignment: Xử Lý Dữ Liệu Lớn Với PySpark & Visualization Report",
      courseName: "Khoa học Dữ liệu & Python Data Analysis",
      deadline: "2026-07-20 23:59",
      fileTypesAllowed: "PDF, Python Script (.py)",
      maxScore: 10,
      totalSubmissions: 29,
      pendingGradingCount: 0,
      status: "CLOSED",
      createdAt: "2026-06-25",
    },
    {
      id: "asg-204",
      title: "Project: Thiết Kế UI/UX Case Study Cho App Đặt Xe Công Nghệ",
      courseName: "Thiết kế UI/UX Product Design Systems",
      deadline: "2026-08-30 23:59",
      fileTypesAllowed: "Figma Link, PDF Report",
      maxScore: 100,
      totalSubmissions: 0,
      pendingGradingCount: 0,
      status: "DRAFT",
      createdAt: "2026-07-22",
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
  const [editingAsg, setEditingAsg] = useState<AssignmentItem | null>(null);

  // Form State
  const [formTitle, setFormTitle] = useState("");
  const [formCourseName, setFormCourseName] = useState("Lập trình ReactJS & NextJS Chuyên Sâu");
  const [formDeadline, setFormDeadline] = useState("2026-08-30 23:59");
  const [formFileTypes, setFormFileTypes] = useState("ZIP, PDF, GitHub Repo Link");
  const [formMaxScore, setFormMaxScore] = useState(100);
  const [formStatus, setFormStatus] = useState<"OPEN" | "CLOSED" | "DRAFT">("OPEN");

  useEffect(() => {
    setJumpPageInput(String(page + 1));
  }, [page]);

  const handleOpenModal = (asg?: AssignmentItem) => {
    if (asg) {
      setEditingAsg(asg);
      setFormTitle(asg.title);
      setFormCourseName(asg.courseName);
      setFormDeadline(asg.deadline);
      setFormFileTypes(asg.fileTypesAllowed);
      setFormMaxScore(asg.maxScore);
      setFormStatus(asg.status);
    } else {
      setEditingAsg(null);
      setFormTitle("");
      setFormCourseName("Lập trình ReactJS & NextJS Chuyên Sâu");
      setFormDeadline("2026-08-30 23:59");
      setFormFileTypes("ZIP, PDF, GitHub Repo Link");
      setFormMaxScore(100);
      setFormStatus("OPEN");
    }
    setIsModalOpen(true);
  };

  const [actionMessage, setActionMessage] = useState<{ text: string; isError?: boolean } | null>(null);
  const [deleteAsgConfirm, setDeleteAsgConfirm] = useState<{ id: string; title: string } | null>(null);

  const showBanner = (text: string, isError = false) => {
    setActionMessage({ text, isError });
    setTimeout(() => setActionMessage(null), 4000);
  };

  const handleSaveAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      showBanner("Vui lòng nhập tiêu đề Assignment!", true);
      return;
    }

    if (editingAsg) {
      setAssignments((prev) =>
        prev.map((a) =>
          a.id === editingAsg.id
            ? {
                ...a,
                title: formTitle,
                courseName: formCourseName,
                deadline: formDeadline,
                fileTypesAllowed: formFileTypes,
                maxScore: formMaxScore,
                status: formStatus,
              }
            : a
        )
      );
      showBanner(`Cập nhật Assignment "${formTitle}" thành công!`);
    } else {
      const newAsg: AssignmentItem = {
        id: `asg-${Date.now()}`,
        title: formTitle,
        courseName: formCourseName,
        deadline: formDeadline,
        fileTypesAllowed: formFileTypes,
        maxScore: formMaxScore,
        totalSubmissions: 0,
        pendingGradingCount: 0,
        status: formStatus,
        createdAt: new Date().toISOString().split("T")[0],
      };
      setAssignments((prev) => [newAsg, ...prev]);
      showBanner(`Tạo mới Assignment "${formTitle}" thành công!`);
    }
    setIsModalOpen(false);
  };

  const handleDeleteAssignment = (id: string, title: string) => {
    setDeleteAsgConfirm({ id, title });
  };

  const confirmDeleteAsgAction = () => {
    if (!deleteAsgConfirm) return;
    setAssignments((prev) => prev.filter((a) => a.id !== deleteAsgConfirm.id));
    showBanner(`Đã xóa Assignment "${deleteAsgConfirm.title}" thành công!`);
    setDeleteAsgConfirm(null);
  };

  const filteredAssignments = assignments.filter((a) => {
    const matchesSearch =
      a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.courseName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "ALL" ? true : a.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const totalElements = filteredAssignments.length;
  const totalPages = Math.ceil(totalElements / pageSize);
  const paginatedAssignments = filteredAssignments.slice(
    page * pageSize,
    (page + 1) * pageSize
  );

  const totalPendingGrading = assignments.reduce((acc, cur) => acc + cur.pendingGradingCount, 0);

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 space-y-6 animate-in fade-in duration-300">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
            <FileCode2 className="h-6 w-6 text-primary" />
            <span>Quản Lý Assignment & Đồ Án (Assignment Management)</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Quản lý các bài tập tự luận, đồ án cuối khóa, thiết lập hạn nộp (Deadline) và chấm điểm học viên.
          </p>
        </div>
        <Button onClick={() => handleOpenModal()} className="rounded-xl font-bold text-xs bg-primary text-primary-foreground gap-1">
          <Plus className="h-4 w-4" /> Tạo Assignment Mới
        </Button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border border-border/80 bg-card rounded-2xl flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/10 text-primary">
            <FileCode2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase">Tổng Bài Assignment</p>
            <p className="text-xl font-extrabold text-foreground">{assignments.length}</p>
          </div>
        </Card>

        <Card className="p-4 border border-border/80 bg-card rounded-2xl flex items-center gap-3">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase">Đang Mở Nộp Bài</p>
            <p className="text-xl font-extrabold text-foreground">
              {assignments.filter((a) => a.status === "OPEN").length}
            </p>
          </div>
        </Card>

        <Card className="p-4 border border-amber-500/30 bg-amber-500/5 rounded-2xl flex items-center gap-3">
          <div className="p-3 rounded-xl bg-amber-500/20 text-amber-600">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-amber-600 uppercase">Bài Chờ Chấm Điểm</p>
            <p className="text-xl font-extrabold text-amber-600">{totalPendingGrading} bài</p>
          </div>
        </Card>

        <Card className="p-4 border border-border/80 bg-card rounded-2xl flex items-center gap-3">
          <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-600">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase">Tổng Bài Đã Nộp</p>
            <p className="text-xl font-extrabold text-foreground">
              {assignments.reduce((acc, cur) => acc + cur.totalSubmissions, 0)} bài
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
                placeholder="Tìm bài Assignment theo tiêu đề hoặc tên khóa học..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
                className="pl-8 h-9 text-xs border border-border bg-background rounded-lg focus-visible:ring-2 focus-visible:ring-primary/20"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1 lg:col-span-4">
            <Label className="text-[11px] font-bold text-muted-foreground">Trạng thái Assignment</Label>
            <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val || "ALL"); setPage(0); }}>
              <SelectTrigger className="h-9 text-xs bg-background border border-border rounded-lg font-semibold">
                <SelectValue placeholder="Tất cả trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
                <SelectItem value="OPEN">Đang mở nộp bài (OPEN)</SelectItem>
                <SelectItem value="CLOSED">Đã đóng hạn nộp (CLOSED)</SelectItem>
                <SelectItem value="DRAFT">Bản nháp (DRAFT)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table Content */}
        <CardContent className="p-0 relative">
          <Table containerClassName="max-h-[calc(100vh-320px)] min-h-[350px] overflow-auto border-b border-border/20" className="-mt-3 pb-4">
            <TableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur-md shadow-2xs border-b border-border/40">
              <TableRow className="border-b border-border/30 bg-muted/20 hover:bg-muted/20">
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-4">Tiêu Đề Assignment</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Khóa Học</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Hạn Nộp (Deadline)</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Định Dạng File / Điểm</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tình Trạng Nộp & Chấm</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Trạng Thái</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right pr-4">Thao Tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="opacity-90">
              {paginatedAssignments.length > 0 ? (
                paginatedAssignments.map((asg) => (
                  <TableRow key={asg.id} className="hover:bg-foreground/10 transition-colors border-border/30">
                    <TableCell className="pl-4">
                      <div className="font-semibold text-xs text-foreground max-w-sm">{asg.title}</div>
                      <div className="text-[10px] font-mono text-muted-foreground">ID: {asg.id} • Tạo {asg.createdAt}</div>
                    </TableCell>
                    <TableCell className="font-semibold text-xs text-foreground">{asg.courseName}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 font-semibold text-xs text-rose-600">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{asg.deadline}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-xs font-medium text-foreground">
                        <Paperclip className="h-3.5 w-3.5 text-primary" />
                        <span>{asg.fileTypesAllowed}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground">Thang điểm tối đa: {asg.maxScore}đ</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-xs text-foreground">{asg.totalSubmissions} bài nộp</div>
                      {asg.pendingGradingCount > 0 ? (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 font-extrabold text-[10px] border border-amber-500/20">
                          Chờ chấm: {asg.pendingGradingCount} bài
                        </span>
                      ) : (
                        <span className="text-[10px] text-emerald-600 font-bold">Đã chấm xong 100%</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {asg.status === "OPEN" && (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-bold border border-emerald-500/20">
                          Đang mở nộp bài
                        </span>
                      )}
                      {asg.status === "CLOSED" && (
                        <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600 text-[10px] font-bold border border-rose-500/20">
                          Đã đóng hạn
                        </span>
                      )}
                      {asg.status === "DRAFT" && (
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 text-[10px] font-bold border border-amber-500/20">
                          Bản nháp
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right pr-4">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          onClick={() => showBanner(`Mở giao diện chấm bài cho Assignment: ${asg.title}`)}
                          variant="ghost"
                          size="sm"
                          title="Chấm bài"
                          className="h-7 text-xs font-semibold text-primary hover:bg-primary/10 gap-1"
                        >
                          <FileCheck className="h-3.5 w-3.5" /> Chấm điểm
                        </Button>
                        <Button
                          onClick={() => handleOpenModal(asg)}
                          variant="ghost"
                          size="icon"
                          title="Chỉnh sửa"
                          className="h-7 w-7 text-muted-foreground hover:bg-muted"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          onClick={() => handleDeleteAssignment(asg.id, asg.title)}
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
                    Không tìm thấy bài Assignment nào phù hợp.
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

      {/* ASSIGNMENT EDIT/CREATE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-lg rounded-3xl border border-border shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-border flex items-center justify-between bg-muted/20">
              <div className="flex items-center gap-2">
                <FileCode2 className="h-5 w-5 text-primary" />
                <h3 className="font-extrabold text-foreground text-sm">
                  {editingAsg ? `Chỉnh Sửa Assignment: ${editingAsg.title}` : "Tạo Assignment Mới"}
                </h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-lg hover:bg-muted text-muted-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAssignment} className="p-6 space-y-4 text-xs">
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-muted-foreground">Tiêu Đề Assignment / Đồ Án</Label>
                <Input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="E.g. Đồ Án Cuối Khóa: Xây Dựng Ứng Dụng E-Commerce"
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-muted-foreground">Khóa Học Đứng Lớp</Label>
                  <Input
                    type="text"
                    value={formCourseName}
                    onChange={(e) => setFormCourseName(e.target.value)}
                    placeholder="E.g. Lập trình ReactJS"
                    className="h-9 text-xs"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-muted-foreground">Hạn Nộp (Deadline)</Label>
                  <Input
                    type="text"
                    value={formDeadline}
                    onChange={(e) => setFormDeadline(e.target.value)}
                    placeholder="E.g. 2026-08-30 23:59"
                    className="h-9 text-xs"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-muted-foreground">Định Dạng File Cho Phép</Label>
                  <Input
                    type="text"
                    value={formFileTypes}
                    onChange={(e) => setFormFileTypes(e.target.value)}
                    placeholder="E.g. ZIP, PDF, GitHub Repo Link"
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-muted-foreground">Thang Điểm Tối Đa</Label>
                  <Input
                    type="number"
                    min={1}
                    value={formMaxScore}
                    onChange={(e) => setFormMaxScore(Number(e.target.value))}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-muted-foreground">Trạng Thái Assignment</Label>
                <Select value={formStatus} onValueChange={(val) => setFormStatus((val as any) || "OPEN")}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Chọn trạng thái" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OPEN">Đang mở nộp bài (OPEN)</SelectItem>
                    <SelectItem value="CLOSED">Đã đóng hạn nộp (CLOSED)</SelectItem>
                    <SelectItem value="DRAFT">Bản nháp (DRAFT)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="h-9 text-xs font-semibold rounded-xl">
                  Hủy
                </Button>
                <Button type="submit" className="h-9 text-xs font-bold bg-primary text-primary-foreground rounded-xl">
                  Lưu Assignment
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TOAST BANNER NOTIFICATIONS */}
      {actionMessage && (
        <div
          className={cn(
            "fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl text-white px-5 py-3.5 shadow-2xl animate-in slide-in-from-bottom-5 duration-300",
            actionMessage.isError ? "bg-destructive" : "bg-emerald-600"
          )}
        >
          <span className="text-sm font-semibold">{actionMessage.text}</span>
        </div>
      )}

      {/* CONFIRM DELETE DIALOG */}
      <ConfirmDialog
        open={Boolean(deleteAsgConfirm)}
        onOpenChange={(open) => { if (!open) setDeleteAsgConfirm(null); }}
        title="Xác nhận xóa Assignment"
        description={`Bạn có chắc muốn xóa Assignment "${deleteAsgConfirm?.title}"? Thao tác không thể hoàn tác.`}
        confirmText="Xóa Assignment"
        cancelText="Hủy bỏ"
        onConfirm={confirmDeleteAsgAction}
      />

    </div>
  );
};
