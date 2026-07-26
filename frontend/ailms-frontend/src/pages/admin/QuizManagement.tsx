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
  HelpCircle,
  Plus,
  Search,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Award,
  CheckCircle2,
  FileQuestion,
  BarChart2,
  X
} from "lucide-react";

export interface QuizItem {
  id: string;
  title: string;
  courseName: string;
  chapterName: string;
  totalQuestions: number;
  durationMinutes: number;
  passingScorePercent: number;
  totalSubmissions: number;
  avgScore: number;
  passRate: number;
  status: "ACTIVE" | "DRAFT" | "CLOSED";
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

export const QuizManagement: React.FC = () => {
  const [quizzes, setQuizzes] = useState<QuizItem[]>([
    {
      id: "qz-101",
      title: "Bài Trắc Nghiệm: React Hooks & State Management (Redux/Zustand)",
      courseName: "Lập trình ReactJS & NextJS Chuyên Sâu",
      chapterName: "Chương 2: State Management & Advanced Hooks",
      totalQuestions: 20,
      durationMinutes: 30,
      passingScorePercent: 80,
      totalSubmissions: 145,
      avgScore: 84.5,
      passRate: 91.2,
      status: "ACTIVE",
      createdAt: "2026-06-10",
    },
    {
      id: "qz-102",
      title: "Bài Trắc Nghiệm Kiến Thức: Transformer Models & Attention Mechanism",
      courseName: "Trí Tuệ Nhân Tạo & LLM Production",
      chapterName: "Chương 4: Deep Learning & Neural Architectures",
      totalQuestions: 15,
      durationMinutes: 25,
      passingScorePercent: 75,
      totalSubmissions: 98,
      avgScore: 78.2,
      passRate: 85.7,
      status: "ACTIVE",
      createdAt: "2026-06-18",
    },
    {
      id: "qz-103",
      title: "Kiểm Tra Giữa Kỳ: Pandas Dataframes & Feature Engineering",
      courseName: "Khoa học Dữ liệu & Python Data Analysis",
      chapterName: "Chương 3: Data Preprocessing & Cleaning",
      totalQuestions: 25,
      durationMinutes: 45,
      passingScorePercent: 70,
      totalSubmissions: 62,
      avgScore: 72.0,
      passRate: 77.4,
      status: "ACTIVE",
      createdAt: "2026-07-01",
    },
    {
      id: "qz-104",
      title: "Bài Quiz Ôn Tập: Design Tokens & Accessibility A11y Standards",
      courseName: "Thiết kế UI/UX Product Design Systems",
      chapterName: "Chương 1: Core Design System Principles",
      totalQuestions: 10,
      durationMinutes: 15,
      passingScorePercent: 80,
      totalSubmissions: 0,
      avgScore: 0,
      passRate: 0,
      status: "DRAFT",
      createdAt: "2026-07-20",
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
  const [editingQuiz, setEditingQuiz] = useState<QuizItem | null>(null);

  // Form State
  const [formTitle, setFormTitle] = useState("");
  const [formCourseName, setFormCourseName] = useState("Lập trình ReactJS & NextJS Chuyên Sâu");
  const [formChapterName, setFormChapterName] = useState("");
  const [formTotalQuestions, setFormTotalQuestions] = useState(15);
  const [formDurationMinutes, setFormDurationMinutes] = useState(30);
  const [formPassingScorePercent, setFormPassingScorePercent] = useState(75);
  const [formStatus, setFormStatus] = useState<"ACTIVE" | "DRAFT" | "CLOSED">("ACTIVE");

  useEffect(() => {
    setJumpPageInput(String(page + 1));
  }, [page]);

  const handleOpenModal = (qz?: QuizItem) => {
    if (qz) {
      setEditingQuiz(qz);
      setFormTitle(qz.title);
      setFormCourseName(qz.courseName);
      setFormChapterName(qz.chapterName);
      setFormTotalQuestions(qz.totalQuestions);
      setFormDurationMinutes(qz.durationMinutes);
      setFormPassingScorePercent(qz.passingScorePercent);
      setFormStatus(qz.status);
    } else {
      setEditingQuiz(null);
      setFormTitle("");
      setFormCourseName("Lập trình ReactJS & NextJS Chuyên Sâu");
      setFormChapterName("");
      setFormTotalQuestions(15);
      setFormDurationMinutes(30);
      setFormPassingScorePercent(75);
      setFormStatus("ACTIVE");
    }
    setIsModalOpen(true);
  };

  const handleSaveQuiz = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      alert("Vui lòng nhập tiêu đề bài Quiz!");
      return;
    }

    if (editingQuiz) {
      setQuizzes((prev) =>
        prev.map((q) =>
          q.id === editingQuiz.id
            ? {
                ...q,
                title: formTitle,
                courseName: formCourseName,
                chapterName: formChapterName,
                totalQuestions: formTotalQuestions,
                durationMinutes: formDurationMinutes,
                passingScorePercent: formPassingScorePercent,
                status: formStatus,
              }
            : q
        )
      );
      alert(`Cập nhật bài Quiz "${formTitle}" thành công!`);
    } else {
      const newQuiz: QuizItem = {
        id: `qz-${Date.now()}`,
        title: formTitle,
        courseName: formCourseName,
        chapterName: formChapterName || "Chương tổng hợp",
        totalQuestions: formTotalQuestions,
        durationMinutes: formDurationMinutes,
        passingScorePercent: formPassingScorePercent,
        totalSubmissions: 0,
        avgScore: 0,
        passRate: 0,
        status: formStatus,
        createdAt: new Date().toISOString().split("T")[0],
      };
      setQuizzes((prev) => [newQuiz, ...prev]);
      alert(`Tạo mới bài Quiz "${formTitle}" thành công!`);
    }
    setIsModalOpen(false);
  };

  const handleDeleteQuiz = (id: string, title: string) => {
    if (confirm(`Bạn có chắc muốn xóa bài Quiz "${title}"?`)) {
      setQuizzes((prev) => prev.filter((q) => q.id !== id));
      alert(`Đã xóa bài Quiz thành công!`);
    }
  };

  const filteredQuizzes = quizzes.filter((q) => {
    const matchesSearch =
      q.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.courseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.chapterName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "ALL" ? true : q.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const totalElements = filteredQuizzes.length;
  const totalPages = Math.ceil(totalElements / pageSize);
  const paginatedQuizzes = filteredQuizzes.slice(
    page * pageSize,
    (page + 1) * pageSize
  );

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 space-y-6 animate-in fade-in duration-300">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
            <HelpCircle className="h-6 w-6 text-primary" />
            <span>Quản Lý Quiz & Ngân Hàng Câu Hỏi (Quiz Management)</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Tạo bài kiểm tra trắc nghiệm, cấu hình thời gian làm bài, điểm qua môn (%) và theo dõi thống kê nộp bài.
          </p>
        </div>
        <Button onClick={() => handleOpenModal()} className="rounded-xl font-bold text-xs bg-primary text-primary-foreground gap-1">
          <Plus className="h-4 w-4" /> Tạo Bài Quiz Mới
        </Button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border border-border/80 bg-card rounded-2xl flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/10 text-primary">
            <FileQuestion className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase">Tổng Số Bài Quiz</p>
            <p className="text-xl font-extrabold text-foreground">{quizzes.length}</p>
          </div>
        </Card>

        <Card className="p-4 border border-border/80 bg-card rounded-2xl flex items-center gap-3">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase">Đang Phát Hành</p>
            <p className="text-xl font-extrabold text-foreground">
              {quizzes.filter((q) => q.status === "ACTIVE").length}
            </p>
          </div>
        </Card>

        <Card className="p-4 border border-border/80 bg-card rounded-2xl flex items-center gap-3">
          <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-600">
            <BarChart2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase">Tổng Lượt Nộp Bài</p>
            <p className="text-xl font-extrabold text-foreground">
              {quizzes.reduce((acc, cur) => acc + cur.totalSubmissions, 0)} lượt
            </p>
          </div>
        </Card>

        <Card className="p-4 border border-border/80 bg-card rounded-2xl flex items-center gap-3">
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-600">
            <Award className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase">Tỷ Lệ Đỗ Đạt Trung Bình</p>
            <p className="text-xl font-extrabold text-foreground">84.8%</p>
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
                placeholder="Tìm kiếm bài Quiz theo tiêu đề, tên khóa học hoặc chương bài giảng..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
                className="pl-8 h-9 text-xs border border-border bg-background rounded-lg focus-visible:ring-2 focus-visible:ring-primary/20"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1 lg:col-span-4">
            <Label className="text-[11px] font-bold text-muted-foreground">Trạng thái bài Quiz</Label>
            <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val || "ALL"); setPage(0); }}>
              <SelectTrigger className="h-9 text-xs bg-background border border-border rounded-lg font-semibold">
                <SelectValue placeholder="Tất cả trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
                <SelectItem value="ACTIVE">Đang phát hành (ACTIVE)</SelectItem>
                <SelectItem value="DRAFT">Bản nháp (DRAFT)</SelectItem>
                <SelectItem value="CLOSED">Đã đóng (CLOSED)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table Content */}
        <CardContent className="p-0 relative">
          <Table containerClassName="max-h-[calc(100vh-320px)] min-h-[350px] overflow-auto border-b border-border/20" className="-mt-3 pb-4">
            <TableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur-md shadow-2xs border-b border-border/40">
              <TableRow className="border-b border-border/30 bg-muted/20 hover:bg-muted/20">
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-4">Tiêu Đề Bài Quiz</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Khóa Học & Chương</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Thời Gian / Số Câu</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Điểm Đỗ (%)</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Lượt Nộp & Đỗ</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Trạng Thái</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right pr-4">Thao Tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="opacity-90">
              {paginatedQuizzes.length > 0 ? (
                paginatedQuizzes.map((qz) => (
                  <TableRow key={qz.id} className="hover:bg-foreground/10 transition-colors border-border/30">
                    <TableCell className="pl-4">
                      <div className="font-semibold text-xs text-foreground max-w-sm">{qz.title}</div>
                      <div className="text-[10px] font-mono text-muted-foreground">ID: {qz.id} • Tạo ngày {qz.createdAt}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-xs text-foreground">{qz.courseName}</div>
                      <div className="text-[10px] text-muted-foreground">{qz.chapterName}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 font-semibold text-xs text-foreground">
                        <Clock className="h-3.5 w-3.5 text-primary" />
                        <span>{qz.durationMinutes} phút</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground">{qz.totalQuestions} câu trắc nghiệm</div>
                    </TableCell>
                    <TableCell>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-extrabold text-[10px] border border-emerald-500/20">
                        Pass: {qz.passingScorePercent}%
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-xs text-foreground">{qz.totalSubmissions} lượt nộp</div>
                      {qz.totalSubmissions > 0 && (
                        <div className="text-[10px] text-emerald-600 font-bold">Đỗ: {qz.passRate}% (ĐTB: {qz.avgScore})</div>
                      )}
                    </TableCell>
                    <TableCell>
                      {qz.status === "ACTIVE" && (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-bold border border-emerald-500/20">
                          Đang phát hành
                        </span>
                      )}
                      {qz.status === "DRAFT" && (
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 text-[10px] font-bold border border-amber-500/20">
                          Bản nháp
                        </span>
                      )}
                      {qz.status === "CLOSED" && (
                        <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600 text-[10px] font-bold border border-rose-500/20">
                          Đã đóng
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right pr-4">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          onClick={() => handleOpenModal(qz)}
                          variant="ghost"
                          size="icon"
                          title="Chỉnh sửa"
                          className="h-7 w-7 text-muted-foreground hover:bg-muted"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          onClick={() => handleDeleteQuiz(qz.id, qz.title)}
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
                    Không tìm thấy bài Quiz nào phù hợp.
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

      {/* QUIZ EDIT/CREATE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-lg rounded-3xl border border-border shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-border flex items-center justify-between bg-muted/20">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-primary" />
                <h3 className="font-extrabold text-foreground text-sm">
                  {editingQuiz ? `Chỉnh Sửa Bài Quiz: ${editingQuiz.title}` : "Tạo Bài Quiz Mới"}
                </h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-lg hover:bg-muted text-muted-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQuiz} className="p-6 space-y-4 text-xs">
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-muted-foreground">Tiêu Đề Bài Quiz</Label>
                <Input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="E.g. Bài Trắc Nghiệm: React Hooks & State Management"
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-muted-foreground">Khóa Học Liên Quan</Label>
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
                  <Label className="text-[11px] font-bold text-muted-foreground">Chương Bài Giảng</Label>
                  <Input
                    type="text"
                    value={formChapterName}
                    onChange={(e) => setFormChapterName(e.target.value)}
                    placeholder="E.g. Chương 2: Hooks"
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-muted-foreground">Số Câu Hỏi</Label>
                  <Input
                    type="number"
                    min={1}
                    value={formTotalQuestions}
                    onChange={(e) => setFormTotalQuestions(Number(e.target.value))}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-muted-foreground">Thời Gian (Phút)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={formDurationMinutes}
                    onChange={(e) => setFormDurationMinutes(Number(e.target.value))}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-muted-foreground">Điểm Pass (%)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={formPassingScorePercent}
                    onChange={(e) => setFormPassingScorePercent(Number(e.target.value))}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-muted-foreground">Trạng Thái Phát Hành</Label>
                <Select value={formStatus} onValueChange={(val) => setFormStatus((val as any) || "ACTIVE")}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Chọn trạng thái" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Đang phát hành (ACTIVE)</SelectItem>
                    <SelectItem value="DRAFT">Bản nháp (DRAFT)</SelectItem>
                    <SelectItem value="CLOSED">Đã đóng (CLOSED)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="h-9 text-xs font-semibold rounded-xl">
                  Hủy
                </Button>
                <Button type="submit" className="h-9 text-xs font-bold bg-primary text-primary-foreground rounded-xl">
                  Lưu Bài Quiz
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
