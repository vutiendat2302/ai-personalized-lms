import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  HelpCircle,
  FileQuestion,
  FileText,
  Plus,
  Search,
  Trash2,
  Edit,
  CheckCircle2,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Eye,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Clock,
  Award,
  Sparkles,
  Send,
  Upload,
  ShieldCheck,
  Calendar,
  Maximize2,
  Minimize2,
} from "lucide-react";

import { quizApi, type QuizResponseItem } from "@/api/quizzes/quizApi";
import { assignmentApi, type AssignmentResponseItem } from "@/api/assignments/assignmentApi";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { QuestionBuilderManager, type QuestionItem } from "@/components/admin/course-builder/QuestionBuilderManager";
import { LearningQuizPlayer } from "@/components/student/learning/LearningQuizPlayer";
import type { QuizResponseDTO } from "@/api/courses/courseAuthoringApi";
import { ClassQuizPublishDialog } from "@/components/teacher/assessment/ClassQuizPublishDialog";

// Format date display (DD/MM/YYYY HH:mm)
const formatDateDisplay = (dateStr?: string | null) => {
  if (!dateStr) return "Chưa cập nhật";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, "0");
    const mins = String(d.getMinutes()).padStart(2, "0");
    return `${day}/${month}/${year} ${hours}:${mins}`;
  } catch {
    return dateStr;
  }
};

// Helpers to clean raw JSON description and extract questions
const getQuizQuestionsList = (quiz: QuizResponseItem | null): any[] => {
  if (!quiz) return [];
  if (Array.isArray(quiz.questions) && quiz.questions.length > 0) {
    return quiz.questions;
  }
  if (quiz.description && quiz.description.trim().startsWith("[")) {
    try {
      const parsed = JSON.parse(quiz.description);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      /* Ignore JSON parse errors */
    }
  }
  return [];
};

const getQuizCleanDescription = (quiz: QuizResponseItem | null): string => {
  if (!quiz || !quiz.description) return "Hãy đọc kỹ câu hỏi và chọn đáp án đúng nhất trước khi nộp bài.";
  if (quiz.description.trim().startsWith("[")) {
    return "Hãy đọc kỹ câu hỏi và chọn đáp án đúng nhất trước khi nộp bài.";
  }
  return quiz.description;
};

/** Đọc hướng dẫn assignment từ JSON block-editor hoặc trả văn bản thuần. */
const getAssignmentInstructions = (assignment: AssignmentResponseItem | null): string => {
  if (!assignment?.description) return "Chưa có hướng dẫn làm bài.";
  if (!assignment.description.trim().startsWith("{")) return assignment.description;
  try {
    const parsed = JSON.parse(assignment.description);
    return typeof parsed?.instructions === "string" && parsed.instructions.trim()
      ? parsed.instructions
      : "Chưa có hướng dẫn làm bài.";
  } catch {
    return assignment.description;
  }
};

interface AssessmentManagementProps {
  scope?: "all" | "authored";
}

/** Giao diện quản lý Quiz/Assignment dùng chung; scope authored bắt buộc gọi API theo người tạo hiện tại. */
export const AssessmentManagement: React.FC<AssessmentManagementProps> = ({ scope = "all" }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const authoredOnly = scope === "authored";

  // Active Tab: "quizzes" | "assignments" (Chỉ 2 Tab)
  const [activeTab, setActiveTab] = useState<"quizzes" | "assignments">(() => {
    if (location.pathname.includes("assignments") || new URLSearchParams(location.search).get("tab") === "assignments") return "assignments";
    return "quizzes";
  });

  // Search & Filter States
  const [searchKeyword, setSearchKeyword] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(false);

  // Data Arrays (Real BE data)
  const [quizzes, setQuizzes] = useState<QuizResponseItem[]>([]);
  const [assignments, setAssignments] = useState<AssignmentResponseItem[]>([]);

  // Selected Checkboxes
  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);

  // Modal States
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedQuizDetail, setSelectedQuizDetail] = useState<QuizResponseItem | null>(null);
  const [selectedAssignmentDetail, setSelectedAssignmentDetail] = useState<AssignmentResponseItem | null>(null);

  // Create / Edit Modal States & Form Data
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    code: "",
    timeLimitMin: 15,
    passScore: 70,
    maxScore: 10.0,
    dueDate: "",
  });

  // Studio Builder State
  const [quizQuestions, setQuizQuestions] = useState<QuestionItem[]>([]);
  const [maxAttempts, setMaxAttempts] = useState(3);
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [allowLate, setAllowLate] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Confirm Delete Dialog
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | number | null>(null);
  const [quizToPublish, setQuizToPublish] = useState<QuizResponseItem | null>(null);

  // Notification Banners
  const [banner, setBanner] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const showBanner = (type: "success" | "error", msg: string) => {
    setBanner({ type, msg });
    setTimeout(() => setBanner(null), 3500);
  };

  // Sync route with activeTab
  const handleTabChange = (tab: "quizzes" | "assignments") => {
    setActiveTab(tab);
    setPage(0);
    setSelectedIds([]);
    setSearchKeyword("");

    if (authoredOnly) {
      navigate(`/teacher/assessments?tab=${tab}`, { replace: true });
    } else if (tab === "quizzes") navigate("/admin/quizzes", { replace: true });
    else navigate("/admin/assignments", { replace: true });
  };

  // Fetch Real Backend Data
  useEffect(() => {
    fetchData();
  }, [activeTab, page, pageSize]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === "quizzes") {
        const res = await (authoredOnly ? quizApi.searchAuthoredQuizzes : quizApi.searchQuizzes)({
          keyword: searchKeyword.trim() || undefined,
          page,
          size: pageSize,
        });
        const data = res.data?.data;
        if (data && Array.isArray(data.content)) {
          setQuizzes(data.content);
          setTotalPages(data.totalPages || 1);
          setTotalElements(data.totalElements || data.content.length);
        } else if (!authoredOnly) {
          // Fallback to getAllQuizzes if search endpoint is empty
          const allRes = await quizApi.getAllQuizzes();
          const allData = allRes.data?.data || [];
          setQuizzes(Array.isArray(allData) ? allData : []);
          setTotalPages(1);
          setTotalElements(Array.isArray(allData) ? allData.length : 0);
        } else {
          setQuizzes([]);
          setTotalPages(1);
          setTotalElements(0);
        }
      } else if (activeTab === "assignments") {
        const res = await (authoredOnly ? assignmentApi.searchAuthoredAssignments : assignmentApi.searchAssignments)({
          keyword: searchKeyword.trim() || undefined,
          page,
          size: pageSize,
        });
        const data = res.data?.data;
        if (data && Array.isArray(data.content)) {
          setAssignments(data.content);
          setTotalPages(data.totalPages || 1);
          setTotalElements(data.totalElements || data.content.length);
        } else if (!authoredOnly) {
          // Fallback to getAllAssignments
          const allRes = await assignmentApi.getAllAssignments();
          const allData = allRes.data?.data || [];
          setAssignments(Array.isArray(allData) ? allData : []);
          setTotalPages(1);
          setTotalElements(Array.isArray(allData) ? allData.length : 0);
        } else {
          setAssignments([]);
          setTotalPages(1);
          setTotalElements(0);
        }
      }
    } catch (e: any) {
      console.warn("Failed to fetch data:", e);
      if (activeTab === "quizzes") setQuizzes([]);
      else setAssignments([]);
      setTotalPages(1);
      setTotalElements(0);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    fetchData();
  };

  /** Tải bản chi tiết trước khi mở preview để luôn có câu hỏi và phương án thật. */
  const handleViewDetail = async (item: QuizResponseItem | AssignmentResponseItem) => {
    if (activeTab === "quizzes") {
      try {
        const response = await (authoredOnly
          ? quizApi.getAuthoredQuizById(item.id)
          : quizApi.getQuizById(item.id));
        setSelectedQuizDetail(response.data.data);
        setSelectedAssignmentDetail(null);
      } catch {
        showBanner("error", "Không thể tải chi tiết câu hỏi của quiz.");
        return;
      }
    } else {
      try {
        const response = await (authoredOnly
          ? assignmentApi.getAuthoredAssignmentById(item.id)
          : assignmentApi.getAssignmentById(item.id));
        setSelectedAssignmentDetail(response.data.data);
        setSelectedQuizDetail(null);
      } catch {
        showBanner("error", "Không thể tải chi tiết bài tập.");
        return;
      }
    }
    setDetailModalOpen(true);
  };

  // Create / Edit Modal Handlers (Studio Builder)
  const handleOpenCreateModal = () => {
    setEditingItem(null);
    setFormData({
      title: "",
      description: "",
      code: "",
      timeLimitMin: 15,
      passScore: 70,
      maxScore: 10.0,
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    });
    setQuizQuestions([]);
    setMaxAttempts(3);
    setShuffleQuestions(true);
    setAllowLate(false);
    setCreateModalOpen(true);
  };

  /** Tải chi tiết assessment trước khi sửa để không ghi đè mất câu hỏi đang có. */
  const handleOpenEditModal = async (item: QuizResponseItem | AssignmentResponseItem) => {
    let detail: QuizResponseItem | AssignmentResponseItem = item;
    try {
      const response = activeTab === "quizzes"
        ? await (authoredOnly ? quizApi.getAuthoredQuizById(item.id) : quizApi.getQuizById(item.id))
        : await (authoredOnly
          ? assignmentApi.getAuthoredAssignmentById(item.id)
          : assignmentApi.getAssignmentById(item.id));
      detail = response.data.data;
    } catch {
      showBanner("error", "Không thể tải dữ liệu chi tiết để chỉnh sửa.");
      return;
    }
    const editable = detail as any;
    setEditingItem(editable);
    setFormData({
      title: editable.title || "",
      description: activeTab === "assignments" ? getAssignmentInstructions(editable) : editable.description || "",
      code: editable.code || "",
      timeLimitMin: editable.timeLimitMin || 15,
      passScore: editable.passScore || 70,
      maxScore: editable.maxScore || 10.0,
      dueDate: editable.dueDate ? editable.dueDate.slice(0, 10) : "",
    });
    setMaxAttempts(editable.maxAttempts || 3);
    setShuffleQuestions(editable.shuffleQuestions !== false);
    setAllowLate(editable.allowLate || false);

    // Extract questions if existing
    if (editable.questions && Array.isArray(editable.questions)) {
      setQuizQuestions(editable.questions);
    } else if (editable.description && editable.description.trim().startsWith("[")) {
      try {
        const parsed = JSON.parse(editable.description);
        if (Array.isArray(parsed)) setQuizQuestions(parsed);
        else setQuizQuestions([]);
      } catch {
        setQuizQuestions([]);
      }
    } else {
      setQuizQuestions([]);
    }
    setCreateModalOpen(true);
  };

  const handleSaveForm = async () => {
    if (!formData.title.trim()) {
      showBanner("error", "Vui lòng nhập tiêu đề!");
      return;
    }

    try {
      if (activeTab === "quizzes") {
        const payload = {
          title: formData.title,
          description: formData.description,
          timeLimitMin: Number(formData.timeLimitMin),
          passScore: Number(formData.passScore),
          maxAttempts,
          shuffleQuestions,
          questions: quizQuestions,
          status: "ACTIVE",
        };

        if (editingItem) {
          await (authoredOnly ? quizApi.updateAuthoredQuiz : quizApi.updateQuiz)(editingItem.id, payload);
          showBanner("success", "Đã cập nhật bài Quiz & danh sách câu hỏi vào CSDL!");
        } else {
          await (authoredOnly ? quizApi.createAuthoredQuiz : quizApi.createQuiz)(payload);
          showBanner("success", "Đã tạo bài Quiz mới với câu hỏi vào CSDL!");
        }
      } else if (activeTab === "assignments") {
        const payload = {
          title: formData.title,
          description: formData.description,
          maxScore: Number(formData.maxScore),
          dueDate: formData.dueDate ? `${formData.dueDate}T23:59:59` : undefined,
          allowLate,
          status: "ACTIVE",
        };

        if (editingItem) {
          await (authoredOnly ? assignmentApi.updateAuthoredAssignment : assignmentApi.updateAssignment)(editingItem.id, payload);
          showBanner("success", "Đã cập nhật bài tập vào CSDL!");
        } else {
          await (authoredOnly ? assignmentApi.createAuthoredAssignment : assignmentApi.createAssignment)(payload);
          showBanner("success", "Đã tạo bài tập mới vào CSDL!");
        }
      }
      setCreateModalOpen(false);
      fetchData();
    } catch (e: any) {
      showBanner("error", e.message || "Lỗi lưu dữ liệu vào CSDL!");
    }
  };

  // Handle Delete
  const handleDeleteClick = (id: string | number) => {
    setItemToDelete(id);
    setConfirmDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      if (activeTab === "quizzes") {
        await (authoredOnly ? quizApi.deleteAuthoredQuiz : quizApi.deleteQuiz)(itemToDelete);
        showBanner("success", "Đã xóa bài kiểm tra thành công!");
      } else {
        await (authoredOnly ? assignmentApi.deleteAuthoredAssignment : assignmentApi.deleteAssignment)(itemToDelete);
        showBanner("success", "Đã xóa bài tập thành công!");
      }
      setConfirmDeleteOpen(false);
      setItemToDelete(null);
      fetchData();
    } catch (e: any) {
      showBanner("error", e.message || "Xóa thất bại!");
    }
  };

  return (
    <div className="mx-auto max-w-none w-full px-6 py-8 lg:px-12 space-y-8 animate-in fade-in-50 duration-300">
      
      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-3 mt-1">
            <HelpCircle className="h-7 w-7 text-primary" />
            <span>Quản Lý Bài Kiểm Tra & Bài Tập</span>
          </h1>
          <p className="text-sm text-foreground/80 mt-0.5">
            {authoredOnly
              ? "Quản lý ngân hàng Quiz và bài tập do chính bạn tạo."
              : "Quản lý ngân hàng câu hỏi Quiz và bài tập tự luận trong hệ thống."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleOpenCreateModal}
            className="text-xs font-bold gap-1.5 rounded-xl bg-white border-border/30 text-foreground hover:bg-foreground hover:text-white shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>{activeTab === "quizzes" ? "Tạo Quiz Mới" : "Tạo Bài Tập Mới"}</span>
          </Button>
        </div>
      </div>

      {/* NOTIFICATION BANNER */}
      {banner && (
        <div
          className={`flex items-center gap-2 p-4 rounded-2xl text-xs font-bold animate-in fade-in-50 ${
            banner.type === "success" ? "bg-green-500/10 text-green-600 border border-green-200" : "bg-destructive/10 text-destructive border border-destructive/20"
          }`}
        >
          {banner.type === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
          <span>{banner.msg}</span>
        </div>
      )}

      {/* 2 TABS SELECTOR (QUIZ & ASSIGNMENT ONLY) */}
      <div className="flex items-center gap-2 border-b border-border/60 pb-1 overflow-x-auto">
        <button
          onClick={() => handleTabChange("quizzes")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "quizzes"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-foreground hover:bg-foreground hover:text-white"
          }`}
        >
          <FileQuestion className="h-4 w-4" />
          <span>Quản Lý Quizz</span>
        </button>

        <button
          onClick={() => handleTabChange("assignments")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "assignments"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-foreground hover:bg-foreground hover:text-white"
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>Quản Lý Bài Tập</span>
        </button>
      </div>

      {/* FILTER & SEARCH BAR */}
      <Card className="border-border shadow-xs bg-card">
        <CardContent className="p-4">
          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-foreground/80" />
              <Input
                placeholder={
                  activeTab === "quizzes"
                    ? "Tìm kiếm bài Quiz..."
                    : "Tìm kiếm bài tập theo tiêu đề..."
                }
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="pl-9 h-9 text-xs rounded-xl border-border/60"
              />
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto shrink-0">
              <Button type="submit" size="sm" className="h-9 text-xs font-semibold hover:bg-foreground hover:text-white rounded-xl gap-1 bg-primary text-primary-foreground">
                <Search className="h-3.5 w-3.5" /> Tìm kiếm
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchKeyword("");
                  setPage(0);
                  fetchData();
                }}
                className="h-9 text-xs font-semibold rounded-xl gap-1 hover:bg-foreground/20 hover:text-white"
              >
                <RefreshCw className="h-3.5 w-3.5 text-foreground group-hover:text-white" />
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* TABLE DISPLAY - CHUẨN CẤU TRÚC ROLEMANAGEMENT.TSX */}
      <Card className="border-border shadow-xs bg-card overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="w-12 text-center">
                    <Checkbox
                      checked={
                        activeTab === "quizzes"
                          ? quizzes.length > 0 && selectedIds.length === quizzes.length
                          : assignments.length > 0 && selectedIds.length === assignments.length
                      }
                      onCheckedChange={(chk) => {
                        if (chk) {
                          const ids =
                            activeTab === "quizzes"
                              ? quizzes.map((q) => q.id)
                              : assignments.map((a) => a.id);
                          setSelectedIds(ids);
                        } else {
                          setSelectedIds([]);
                        }
                      }}
                    />
                  </TableHead>

                  <TableHead className="font-extrabold text-xs opacity-80">Code</TableHead>
                  <TableHead className="font-extrabold text-xs opacity-80">
                    {activeTab === "quizzes" ? "Tiêu Đề " : "Tiêu Đề "}
                  </TableHead>
                  
                  {activeTab === "quizzes" ? (
                    <>
                      <TableHead className="font-extrabold text-xs text-center opacity-80">Thời Gian (Phút)</TableHead>
                      <TableHead className="font-extrabold text-xs text-center opacity-80">Điểm Đạt</TableHead>
                    </>
                  ) : (
                    <>
                      <TableHead className="font-extrabold text-xs text-center opacity-80">Điểm Tối Đa</TableHead>
                      <TableHead className="font-extrabold text-xs opacity-80">Hạn Nộp</TableHead>
                    </>
                  )}

                  <TableHead className="font-extrabold text-xs opacity-80">Người Tạo</TableHead>
                  <TableHead className="font-extrabold text-xs opacity-80">Thời Gian Tạo</TableHead>
                  <TableHead className="font-extrabold text-xs text-center opacity-80">Trạng Thái</TableHead>
                  <TableHead className="font-extrabold text-xs text-right pr-6 opacity-80">Thao Tác</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="h-48 text-center">
                      <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                        <Loader2 className="h-7 w-7 animate-spin text-primary" />
                        <span className="text-xs font-bold">Đang tải dữ liệu từ CSDL...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : activeTab === "quizzes" && quizzes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="h-48 text-center">
                      <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                        <FileQuestion className="h-10 w-10 text-muted-foreground/30" />
                        <span className="text-xs font-extrabold text-foreground">Không có bài Quiz nào trong CSDL.</span>
                        <span className="text-xs">Bấm "Tạo Quiz Mới" để bắt đầu soạn đề thi.</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : activeTab === "assignments" && assignments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="h-48 text-center">
                      <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                        <FileText className="h-10 w-10 text-muted-foreground/30" />
                        <span className="text-xs font-extrabold text-foreground">Không có bài tập nào trong CSDL.</span>
                        <span className="text-xs">Bấm "Tạo Bài Tập Mới" để bổ sung bài làm.</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : activeTab === "quizzes" ? (
                  // QUIZ LIST ROWS
                  quizzes.map((quiz) => (
                    <TableRow key={quiz.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="text-center">
                        <Checkbox
                          checked={selectedIds.includes(quiz.id)}
                          onCheckedChange={(chk) => {
                            if (chk) setSelectedIds([...selectedIds, quiz.id]);
                            else setSelectedIds(selectedIds.filter((i) => i !== quiz.id));
                          }}
                        />
                      </TableCell>

                      <TableCell className="font-mono text-xs font-bold text-primary">
                        {quiz.code || `QZ-${quiz.id}`}
                      </TableCell>

                      <TableCell>
                        <div className="font-extrabold text-xs text-foreground">{quiz.title}</div>
                        <div className="text-[11px] text-muted-foreground truncate max-w-md">{getQuizCleanDescription(quiz)}</div>
                      </TableCell>

                      <TableCell className="text-center font-mono text-xs font-semibold">
                        {quiz.timeLimitMin ? `${quiz.timeLimitMin} phút` : "Không giới hạn"}
                      </TableCell>

                      <TableCell className="text-center font-mono text-xs font-bold text-emerald-600">
                        {quiz.passScore ?? 5.0} điểm
                      </TableCell>

                      <TableCell className="text-xs font-medium text-muted-foreground">
                        {quiz.createdBy || "Admin"}
                      </TableCell>

                      <TableCell className="text-xs font-mono text-muted-foreground">
                        {formatDateDisplay(quiz.createdAt)}
                      </TableCell>

                      <TableCell className="text-center">
                        <Badge className={quiz.status === "ACTIVE" ? "bg-emerald-600 text-white font-bold text-[10px]" : "bg-amber-600 text-white font-bold text-[10px]"}>
                          {quiz.status === "ACTIVE" ? "Đang hoạt động" : "Bài nháp"}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => void handleViewDetail(quiz)}
                            className="h-8 text-xs font-bold gap-1 text-primary hover:bg-primary/10 rounded-xl"
                            title="Xem chi tiết & Preview giao diện học sinh"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>Preview</span>
                          </Button>
                          {authoredOnly && !quiz.classId && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setQuizToPublish(quiz);
                              }}
                              className="h-8 gap-1 rounded-xl text-xs font-bold text-primary hover:bg-primary/10"
                              title="Phát hành Quiz vào lớp"
                            >
                              <Send className="h-3.5 w-3.5" /><span>Giao lớp</span>
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => void handleOpenEditModal(quiz)}
                            className="h-8 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl"
                            title="Sửa bài Quiz"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteClick(quiz.id)}
                            className="h-8 text-xs font-bold text-destructive hover:bg-destructive/10 rounded-xl"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  // ASSIGNMENT LIST ROWS
                  assignments.map((asn) => (
                    <TableRow key={asn.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="text-center">
                        <Checkbox
                          checked={selectedIds.includes(asn.id)}
                          onCheckedChange={(chk) => {
                            if (chk) setSelectedIds([...selectedIds, asn.id]);
                            else setSelectedIds(selectedIds.filter((i) => i !== asn.id));
                          }}
                        />
                      </TableCell>

                      <TableCell className="font-mono text-xs font-bold text-primary">
                        {asn.code || `ASN-${asn.id}`}
                      </TableCell>

                      <TableCell>
                        <div className="font-extrabold text-xs text-foreground">{asn.title}</div>
                        <div className="text-[11px] text-muted-foreground truncate max-w-md">{getAssignmentInstructions(asn)}</div>
                      </TableCell>

                      <TableCell className="text-center font-mono text-xs font-bold text-emerald-600">
                        {asn.maxScore ?? 10.0} điểm
                      </TableCell>

                      <TableCell className="font-mono text-xs text-foreground">
                        {formatDateDisplay(asn.dueDate)}
                      </TableCell>

                      <TableCell className="text-xs font-medium text-muted-foreground">
                        {asn.createdBy || "Admin"}
                      </TableCell>

                      <TableCell className="text-xs font-mono text-muted-foreground">
                        {formatDateDisplay(asn.createdAt)}
                      </TableCell>

                      <TableCell className="text-center">
                        <Badge className={asn.status === "ACTIVE" ? "bg-emerald-600 text-white font-bold text-[10px]" : "bg-amber-600 text-white font-bold text-[10px]"}>
                          {asn.status === "ACTIVE" ? "Đang hoạt động" : "Bài nháp"}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => void handleViewDetail(asn)}
                            className="h-8 text-xs font-bold gap-1 text-primary hover:bg-primary/10 rounded-xl"
                            title="Xem chi tiết & Preview giao diện học sinh"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>Preview</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => void handleOpenEditModal(asn)}
                            className="h-8 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl"
                            title="Sửa bài tập"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteClick(asn.id)}
                            className="h-8 text-xs font-bold text-destructive hover:bg-destructive/10 rounded-xl"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* PAGINATION BAR */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border-t border-border/30">
            <div className="text-xs text-foreground/80">
              Hiển thị <strong className="text-foreground/80">{totalElements}</strong> kết quả từ CSDL
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-foreground/80 font-semibold">Số dòng:</span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(val) => {
                    setPageSize(Number(val));
                    setPage(0);
                  }}
                >
                  <SelectTrigger className="h-8 w-20 text-xs rounded-xl border-border/60">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  className="h-8 px-3 text-xs font-bold rounded-xl"
                >
                  <ChevronLeft className="h-4 w-4" /> Trước
                </Button>
                <span className="text-xs font-semibold text-foreground/80 px-1">
                  Trang {page + 1} / {Math.max(totalPages, 1)}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page + 1 >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="h-8 px-3 text-xs font-bold rounded-xl"
                >
                  Sau <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* MODAL XEM CHI TIẾT & PREVIEW GIAO DIỆN HỌC SINH (STUDIO PREVIEW) */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-w-5xl w-[96vw] max-h-[92vh] overflow-y-auto p-6 md:p-8 space-y-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
              {selectedQuizDetail ? (
                <>
                  <FileQuestion className="h-5 w-5 text-primary" />
                  <span>Chi Tiết Quiz & Preview</span>
                </>
              ) : (
                <>
                  <FileText className="h-5 w-5 text-primary" />
                  <span>Chi Tiết Bài Tập & Preview</span>
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Thông tin người tạo, người cập nhật và bản xem trước giao diện học sinh làm bài.
            </DialogDescription>
          </DialogHeader>

          {/* AUDIT INFORMATION SECTION (người tạo, thời gian tạo, ng update, thời gian update) */}
          <div className="p-4 bg-muted/30 rounded-2xl border border-border/50 space-y-3">
            <h4 className="text-xs font-bold text-primary flex items-center gap-1.5 uppercase tracking-wider">
              <ShieldCheck className="h-4 w-4" /> Thông Tin Audit Bản Ghi
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <p className="text-muted-foreground">👤 Người tạo: <strong className="text-foreground font-mono">{selectedQuizDetail?.createdBy || selectedAssignmentDetail?.createdBy || "Admin System"}</strong></p>
                <p className="text-muted-foreground">🕒 Thời gian tạo: <strong className="text-foreground font-mono">{formatDateDisplay(selectedQuizDetail?.createdAt || selectedAssignmentDetail?.createdAt)}</strong></p>
              </div>

              <div className="space-y-1">
                <p className="text-muted-foreground">✏️ Người cập nhật: <strong className="text-foreground font-mono">{selectedQuizDetail?.updatedBy || selectedAssignmentDetail?.updatedBy || "Chưa chỉnh sửa"}</strong></p>
                <p className="text-muted-foreground">🔄 Thời gian cập nhật: <strong className="text-foreground font-mono">{formatDateDisplay(selectedQuizDetail?.updatedAt || selectedAssignmentDetail?.updatedAt)}</strong></p>
              </div>
            </div>
          </div>

          {/* PREVIEW QUIZ STUDIO FOR STUDENT (INTERACTIVE LEARNING QUIZ PLAYER) */}
          {selectedQuizDetail && (
            <div className="space-y-4 pt-2 border-t border-border/40">
              <div className="p-3 bg-amber-500/10 border border-amber-300/40 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>Giao Diện Học Sinh Làm Bài Trực Tiếp (Interactive Student Quiz Player)</span>
                </div>
                <Badge className="bg-amber-600 text-white text-[10px] font-bold">Studio Interactive Mode</Badge>
              </div>

              <LearningQuizPlayer
                quiz={{
                  id: String(selectedQuizDetail.id),
                  code: selectedQuizDetail.code || `QZ-${selectedQuizDetail.id}`,
                  title: selectedQuizDetail.title || "Bài kiểm tra Quiz",
                  description: getQuizCleanDescription(selectedQuizDetail),
                  timeLimitMin: selectedQuizDetail.timeLimitMin || 15,
                  passScore: selectedQuizDetail.passScore ?? 8.0,
                  maxAttempts: selectedQuizDetail.maxAttempts || 3,
                  shuffleQuestions: selectedQuizDetail.shuffleQuestions !== false,
                  questions: getQuizQuestionsList(selectedQuizDetail),
                }}
                onComplete={() => {
                  /* Player allows retry and review inside component */
                }}
              />
            </div>
          )}

          {/* PREVIEW ASSIGNMENT STUDIO FOR STUDENT */}
          {selectedAssignmentDetail && (
            <div className="space-y-4">
              <div className="p-5 bg-card border-2 border-primary/30 rounded-2xl shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/50 pb-3">
                  <div>
                    <Badge variant="outline" className="text-[10px] font-bold text-primary border-primary/40 mb-1">
                      Mã: {selectedAssignmentDetail.code || `ASN-${selectedAssignmentDetail.id}`}
                    </Badge>
                    <h3 className="font-extrabold text-base text-foreground">{selectedAssignmentDetail.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-wrap">{getAssignmentInstructions(selectedAssignmentDetail)}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className="bg-emerald-600 text-white font-bold text-xs gap-1">
                      <Award className="h-3.5 w-3.5" /> Tối đa: {selectedAssignmentDetail.maxScore ?? 10.0}đ
                    </Badge>
                    <Badge className="bg-purple-600 text-white font-bold text-xs gap-1">
                      <Calendar className="h-3.5 w-3.5" /> Hạn nộp: {formatDateDisplay(selectedAssignmentDetail.dueDate)}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  <h4 className="text-xs font-extrabold text-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-amber-500" /> Bản Preview Bài Tự Luận (Giao Diện Học Sinh Nộp Bài)
                  </h4>

                  <div className="p-4 bg-muted/20 rounded-xl border border-border/40 space-y-3">
                    <Label className="text-xs font-bold text-foreground">Yêu cầu nội dung làm bài</Label>
                    <textarea
                      rows={4}
                      readOnly
                      value={getAssignmentInstructions(selectedAssignmentDetail)}
                      className="w-full text-xs p-3 rounded-lg border border-input bg-background outline-none resize-none"
                    />

                    <div className="border-2 border-dashed border-border/60 rounded-xl p-4 text-center bg-background">
                      <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-1" />
                      <p className="text-xs font-bold text-foreground">Tải lên file bài nộp (PDF, DOCX, ZIP)</p>
                      <p className="text-[10px] text-muted-foreground">Dung lượng tối đa 25MB</p>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button size="sm" disabled className="font-bold text-xs gap-1.5">
                      <Upload className="h-3.5 w-3.5" /> Preview không ghi bài nộp
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button size="sm" variant="outline" onClick={() => setDetailModalOpen(false)} className="rounded-xl font-bold">
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CONFIRM DELETE DIALOG */}
      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title="Xác nhận xóa bản ghi"
        description="Bạn có chắc chắn muốn xóa bản ghi này khỏi CSDL MySQL không? Hành động này không thể hoàn tác."
        confirmText="Xóa vĩnh viễn"
        cancelText="Hủy"
        onConfirm={handleConfirmDelete}
      />

      {quizToPublish && (
        <ClassQuizPublishDialog
          open
          onOpenChange={(value) => {
            if (!value) setQuizToPublish(null);
          }}
          quizId={String(quizToPublish.id)}
          quizTitle={quizToPublish.title}
          courseId={quizToPublish.courseId == null ? undefined : String(quizToPublish.courseId)}
        />
      )}

      {/* CREATE / EDIT FORM DIALOG FOR QUIZ & ASSIGNMENT (STUDIO AUTHORING EXPERIENCE) */}
      <Dialog
        open={createModalOpen}
        onOpenChange={(open) => {
          setCreateModalOpen(open);
          if (!open) {
            setIsFullscreen(false);
            if (document.fullscreenElement && document.exitFullscreen) {
              document.exitFullscreen().catch(() => {});
            }
          }
        }}
      >
        <DialogContent
          className={cn(
            "transition-all duration-200 flex flex-col justify-between overflow-hidden bg-card border-border/60 shadow-2xl p-6",
            isFullscreen
              ? "!fixed !top-0 !left-0 !translate-x-0 !translate-y-0 !w-screen !h-screen !max-w-none !max-h-none !rounded-none !border-none !m-0 !z-[100]"
              : "max-w-4xl w-[94vw] max-h-[92vh] rounded-2xl"
          )}
        >
          <DialogHeader className="border-b border-border/40 pb-3 flex flex-row items-center justify-between gap-4 shrink-0">
            <div>
              <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                {activeTab === "quizzes" ? (
                  <>
                    <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600">
                      <HelpCircle className="h-5 w-5" />
                    </div>
                    <span>{editingItem ? "Soạn thảo / Chỉnh sửa Bài kiểm tra Quiz (Studio Authoring)" : "Tạo mới Bài kiểm tra Quiz (Studio Authoring)"}</span>
                  </>
                ) : (
                  <>
                    <div className="p-2 bg-purple-500/10 text-purple-600 rounded-lg">
                      <FileText className="h-5 w-5" />
                    </div>
                    <span>{editingItem ? "Thiết lập Bài tập tự luận (Studio Authoring)" : "Tạo mới Bài tập tự luận (Studio Authoring)"}</span>
                  </>
                )}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Thiết lập cấu hình và danh sách câu hỏi trực tiếp vào CSDL hệ thống.
              </DialogDescription>
            </div>

            {/* FULLSCREEN TOGGLE BUTTON */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const nextState = !isFullscreen;
                setIsFullscreen(nextState);
                try {
                  if (nextState) {
                    if (document.documentElement.requestFullscreen) {
                      document.documentElement.requestFullscreen().catch(() => {});
                    }
                  } else {
                    if (document.fullscreenElement && document.exitFullscreen) {
                      document.exitFullscreen().catch(() => {});
                    }
                  }
                } catch {
                  /* Ignore browser security restrictions if blocked */
                }
              }}
              className="h-8 px-3 text-xs font-bold gap-1.5 rounded-xl border-border/60 hover:bg-muted shrink-0 cursor-pointer"
              title={isFullscreen ? "Thu nhỏ cửa sổ" : "Chế độ toàn màn hình (Fullscreen)"}
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="h-4 w-4 text-primary" />
                  <span className="hidden sm:inline">Thu nhỏ</span>
                </>
              ) : (
                <>
                  <Maximize2 className="h-4 w-4 text-primary" />
                  <span className="hidden sm:inline">Toàn màn hình</span>
                </>
              )}
            </Button>
          </DialogHeader>

          {/* SCROLLABLE BODY CONTAINER */}
          <div className="flex-1 overflow-y-auto py-2 pr-1 space-y-6">

          {activeTab === "quizzes" ? (
            /* QUIZ STUDIO BUILDER */
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs font-bold">Tiêu đề bài kiểm tra (Quiz Title)</Label>
                  <Input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    className="h-9 text-sm"
                    placeholder="VD: Quiz Chương 1: JPA & Hibernate Core"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold">Mã định danh Quiz (Code)</Label>
                  <Input
                    type="text"
                    value={formData.code}
                    readOnly
                    className="h-9 text-sm font-mono"
                    placeholder="Backend tự sinh sau khi lưu"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">Mô tả / Hướng dẫn cho học viên trước khi làm bài</Label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Ghi chú hướng dẫn cho học viên..."
                  className="w-full text-xs p-3 rounded-lg border border-input bg-background outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs font-bold flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" /> Thời gian làm bài (Phút)
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    value={formData.timeLimitMin}
                    onChange={(e) => setFormData({ ...formData, timeLimitMin: parseInt(e.target.value) || 1 })}
                    className="h-9 text-sm font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-muted-foreground" /> Điểm đạt tối thiểu (Thang 100)
                  </Label>
                  <Input
                    type="number"
                    step="0.5"
                    min={0}
                    max={100}
                    value={formData.passScore}
                    onChange={(e) => setFormData({ ...formData, passScore: parseFloat(e.target.value) || 0 })}
                    className="h-9 text-sm font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold">Số lần cho phép làm lại</Label>
                  <Input
                    type="number"
                    min={1}
                    value={maxAttempts}
                    onChange={(e) => setMaxAttempts(parseInt(e.target.value) || 1)}
                    className="h-9 text-sm font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <Checkbox
                  id="shuffle"
                  checked={shuffleQuestions}
                  onCheckedChange={(checked) => setShuffleQuestions(Boolean(checked))}
                />
                <Label htmlFor="shuffle" className="text-xs font-medium cursor-pointer">
                  Xáo trộn ngẫu nhiên thứ tự câu hỏi khi học viên bắt đầu làm bài
                </Label>
              </div>

              {/* INTERACTIVE QUESTION BUILDER MANAGER */}
              <div className="pt-4 border-t border-border/40">
                <QuestionBuilderManager questions={quizQuestions} onChange={setQuizQuestions} />
              </div>
            </div>
          ) : (
            /* ASSIGNMENT STUDIO BUILDER */
            <div className="space-y-6">
              <div className="space-y-1">
                <Label className="text-xs font-bold">Tiêu đề bài tập tự luận (Assignment Title)</Label>
                <Input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  className="h-9 text-sm"
                  placeholder="VD: Bài tập thiết kế sơ đồ CSDL Quản Lý Học Tập"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">Yêu cầu & Hướng dẫn làm bài (Markdown / Text Format)</Label>
                <textarea
                  rows={6}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Mô tả chi tiết đề bài, rubric chấm điểm và các yêu cầu nộp file..."
                  className="w-full text-xs p-3 rounded-lg border border-input bg-background outline-none resize-none font-mono"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs font-bold flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-muted-foreground" /> Điểm tối đa (Max Score)
                  </Label>
                  <Input
                    type="number"
                    step="0.5"
                    min={1}
                    value={formData.maxScore}
                    onChange={(e) => setFormData({ ...formData, maxScore: parseFloat(e.target.value) || 10 })}
                    className="h-9 text-sm font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground" /> Hạn nộp bài (Due Date)
                  </Label>
                  <Input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="h-9 text-sm font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <Checkbox
                  id="allowLate"
                  checked={allowLate}
                  onCheckedChange={(checked) => setAllowLate(Boolean(checked))}
                />
                <Label htmlFor="allowLate" className="text-xs font-medium cursor-pointer">
                  Cho phép học viên nộp muộn sau hạn nộp (đánh dấu Late Submission)
                </Label>
              </div>
            </div>
          )}
          </div>

          <DialogFooter className="gap-2 border-t border-border/40 pt-4 shrink-0">
            <Button size="sm" variant="outline" onClick={() => setCreateModalOpen(false)} className="rounded-xl font-bold">
              Hủy
            </Button>
            <Button
              size="sm"
              disabled={!formData.title.trim()}
              onClick={handleSaveForm}
              className="rounded-xl font-bold bg-primary text-primary-foreground gap-1.5 shadow-sm"
            >
              {editingItem ? "Lưu Cập Nhật Về CSDL" : "Tạo Mới Về CSDL"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};
