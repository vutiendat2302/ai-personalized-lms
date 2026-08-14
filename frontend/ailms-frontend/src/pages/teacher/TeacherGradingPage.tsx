import React, { useState, useEffect } from "react";
import {
  teacherApi,
  type SubmissionItem,
  type FillBlankQuestionItem,
  type QuestionDifficultyStat,
} from "@/api/teacher/teacherApi";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/useToast";
import {
  ClipboardList,
  FileCheck,
  CheckCircle,
  XCircle,
  BarChart2,
  Eye,
  User,
  HelpCircle,
  GraduationCap,
  Sparkles,
  ExternalLink,
  Award,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";

/**
 * Trang gộp Chấm điểm Bài tập (Assignment), Bài Quiz điền từ (Fill-Blank) và Bài thi dành cho Giảng viên/Trợ giảng.
 */
export const TeacherGradingPage: React.FC = () => {
  const { success: showSuccess, error: showError } = useToast();
  const [searchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState<"ASSIGNMENTS" | "FILL_BLANK" | "DIFFICULTY">("ASSIGNMENTS");
  const [loading, setLoading] = useState(true);

  // Assignment Submissions State
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<SubmissionItem | null>(null);
  const [gradeScore, setGradeScore] = useState<number>(0);
  const [gradeFeedback, setGradeFeedback] = useState<string>("");
  const [gradingBusy, setGradingBusy] = useState(false);

  // Fill-Blank Quizzes State
  const [fillBlankItems, setFillBlankItems] = useState<FillBlankQuestionItem[]>([]);
  const [selectedQuizDetail, setSelectedQuizDetail] = useState<FillBlankQuestionItem | null>(null);

  // Difficulty Stats State
  const [difficultyStats, setDifficultyStats] = useState<QuestionDifficultyStat[]>([]);

  /** Tải tất cả hàng đợi chấm bài từ Backend. */
  useEffect(() => {
    setLoading(true);
    Promise.all([
      teacherApi.getAssignmentSubmissions().catch(() => []),
      teacherApi.getFillBlankQuizzes().catch(() => []),
      teacherApi.getQuestionDifficultyStats().catch(() => []),
    ])
      .then(([subRes, fbRes, diffRes]) => {
        setSubmissions(subRes);
        setFillBlankItems(fbRes);
        setDifficultyStats(diffRes);
        const submissionId = searchParams.get("submissionId");
        const attemptId = searchParams.get("attemptId");
        const linkedSubmission = subRes.find((item) => item.id === submissionId);
        const linkedQuiz = fbRes.find((item) => item.attemptId === attemptId);
        if (linkedSubmission) {
          setActiveTab("ASSIGNMENTS");
          setSelectedSubmission(linkedSubmission);
          setGradeScore(linkedSubmission.maxScore);
        } else if (linkedQuiz) {
          setActiveTab("FILL_BLANK");
          setSelectedQuizDetail(linkedQuiz);
        }
      })
      .finally(() => setLoading(false));
  }, [searchParams]);

  /** Mở modal chấm bài tập tự luận. */
  const handleOpenGradeSubmission = (sub: SubmissionItem) => {
    setSelectedSubmission(sub);
    setGradeScore(sub.maxScore);
    setGradeFeedback("");
  };

  /** Xử lý nộp điểm bài tập tự luận. */
  const handleSubmitSubmissionGrade = async () => {
    if (!selectedSubmission) return;
    try {
      setGradingBusy(true);
      await teacherApi.gradeSubmission(selectedSubmission.id, gradeScore, gradeFeedback);
      showSuccess(`Đã cho ${gradeScore}/${selectedSubmission.maxScore} điểm cho học viên ${selectedSubmission.studentName}!`);
      setSubmissions((prev) => prev.filter((s) => s.id !== selectedSubmission.id));
      setSelectedSubmission(null);
    } catch {
      showError("Chấm điểm bài nộp thất bại. Vui lòng thử lại.");
    } finally {
      setGradingBusy(false);
    }
  };

  /** Xử lý chấm tay cho câu hỏi điền từ trong Quiz. */
  const handleGradeFillBlank = async (id: string, points: number, studentName: string) => {
    try {
      await teacherApi.gradeFillBlankQuestion(id, points);
      showSuccess(`Đã chấm ${points} điểm cho câu trả lời của ${studentName}!`);
      setFillBlankItems((prev) => prev.filter((i) => i.id !== id));
      if (selectedQuizDetail?.id === id) {
        setSelectedQuizDetail(null);
      }
    } catch {
      showError("Chấm điểm câu hỏi điền từ thất bại.");
    }
  };

  if (loading) {
    return (
      <div className="p-16 text-center text-muted-foreground space-y-3">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
        <p className="text-xs font-semibold">Đang tải toàn bộ hàng đợi chấm bài & bài thi...</p>
      </div>
    );
  }

  const totalPendingCount = submissions.length + fillBlankItems.length;

  return (
    <div className="space-y-6 pb-16">
      {/* HEADER BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-5 rounded-2xl border border-border/50 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
            <ClipboardList className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
                Chấm Bài Tập, Quiz & Bài Thi
              </h1>
              {totalPendingCount > 0 && (
                <Badge className="bg-amber-500 text-white font-bold text-xs">
                  {totalPendingCount} bài chờ chấm
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Trung tâm chấm điểm tập trung: Duyệt bài tự luận, chấm tay Quiz điền từ và theo dõi thống kê độ khó bài kiểm tra.
            </p>
          </div>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex border-b border-border/50 space-x-2">
        <button
          onClick={() => setActiveTab("ASSIGNMENTS")}
          className={`px-4 py-3 text-xs font-bold transition border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === "ASSIGNMENTS"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <ClipboardList className="h-4 w-4" />
          <span>Bài tập tự luận ({submissions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("FILL_BLANK")}
          className={`px-4 py-3 text-xs font-bold transition border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === "FILL_BLANK"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileCheck className="h-4 w-4" />
          <span>Bài Quiz & Điền từ ({fillBlankItems.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("DIFFICULTY")}
          className={`px-4 py-3 text-xs font-bold transition border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === "DIFFICULTY"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <BarChart2 className="h-4 w-4" />
          <span>Phân tích độ khó câu hỏi (% Sai)</span>
        </button>
      </div>

      {/* TAB 1: ASSIGNMENTS QUEUE */}
      {activeTab === "ASSIGNMENTS" && (
        <div className="space-y-4">
          {submissions.length === 0 ? (
            <Card className="bg-card border-border/40 p-12 text-center text-muted-foreground space-y-2 shadow-xs rounded-2xl">
              <CheckCircle className="h-10 w-10 text-emerald-500 mx-auto" />
              <p className="text-base font-bold text-foreground">Tuyệt vời! Đã chấm hoàn tất toàn bộ bài tập trong hàng đợi.</p>
              <p className="text-xs text-muted-foreground">Khi học viên nộp bài tập mới, bài làm sẽ tự động hiển thị tại đây.</p>
            </Card>
          ) : (
            submissions.map((sub) => (
              <Card key={sub.id} className="bg-card border-border/50 p-5 space-y-4 shadow-xs rounded-2xl hover:border-primary/40 transition-all">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-3">
                  <div>
                    <span className="text-xs font-bold text-primary uppercase tracking-wider">{sub.className}</span>
                    <h3 className="text-sm md:text-base font-bold text-foreground mt-0.5">{sub.assignmentTitle}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {sub.isLate && (
                      <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-500/20 text-[10px] font-bold">
                        Nộp trễ hạn
                      </Badge>
                    )}
                    <Badge variant="secondary" className="text-xs font-bold">
                      Tối đa {sub.maxScore} điểm
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    <span>Học viên: <strong className="text-foreground">{sub.studentName}</strong> ({sub.studentEmail})</span>
                  </div>
                  <span>Nộp lúc: {sub.submittedAt}</span>
                </div>

                <div className="p-3.5 bg-muted/40 rounded-xl border border-border/40 space-y-2 text-xs">
                  <span className="font-bold text-foreground block">Nội dung bài làm / Link gửi:</span>
                  <p className="text-foreground leading-relaxed whitespace-pre-wrap font-mono bg-background p-3 rounded-lg border border-border/40">
                    {sub.content}
                  </p>
                  {sub.attachmentUrl && (
                    <a
                      href={sub.attachmentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline mt-1"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Xem file đính kèm / Link dự án
                    </a>
                  )}
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    onClick={() => handleOpenGradeSubmission(sub)}
                    className="h-9 px-4 text-xs font-bold rounded-xl shadow-xs cursor-pointer gap-1.5"
                  >
                    <Award className="h-4 w-4" />
                    Chấm điểm bài nộp này
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* TAB 2: FILL_BLANK QUIZZES QUEUE */}
      {activeTab === "FILL_BLANK" && (
        <div className="space-y-4">
          {fillBlankItems.length === 0 ? (
            <Card className="bg-card border-border/40 p-12 text-center text-muted-foreground space-y-2 shadow-xs rounded-2xl">
              <CheckCircle className="h-10 w-10 text-emerald-500 mx-auto" />
              <p className="text-base font-bold text-foreground">Đã hoàn thành chấm toàn bộ các câu Quiz tự luận & điền từ!</p>
            </Card>
          ) : (
            fillBlankItems.map((item) => (
              <Card key={item.id} className="bg-card border-border/50 p-5 space-y-4 shadow-xs rounded-2xl">
                <div className="flex items-center justify-between text-xs border-b border-border/40 pb-3">
                  <span className="font-bold text-foreground text-sm flex items-center gap-2">
                    <HelpCircle className="h-4.5 w-4.5 text-primary" />
                    {item.quizTitle}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Học viên: <strong className="text-primary">{item.studentName}</strong></span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedQuizDetail(item)}
                      className="h-8 px-3 text-xs font-bold gap-1.5 border-primary/30 text-primary hover:bg-primary/10 rounded-xl cursor-pointer"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Xem chi tiết bài làm
                    </Button>
                  </div>
                </div>

                <div className="p-3.5 bg-muted/40 rounded-xl border border-border/40 space-y-2 text-xs">
                  <p className="text-foreground font-semibold">{item.questionText}</p>
                  <div className="flex flex-wrap items-center gap-4 text-xs font-mono pt-1">
                    <span className="text-amber-600 dark:text-amber-400">Học viên điền: <strong>"{item.studentAnswer}"</strong></span>
                    <span className="text-muted-foreground">Đáp án chuẩn: "{item.correctAnswer}"</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-muted-foreground">Điểm tối đa: {item.maxPoints} điểm</span>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => void handleGradeFillBlank(item.id, item.maxPoints, item.studentName)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl cursor-pointer gap-1 h-8"
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                      Đúng ({item.maxPoints} điểm)
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => void handleGradeFillBlank(item.id, 0, item.studentName)}
                      className="bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800 text-xs font-bold rounded-xl cursor-pointer gap-1 hover:bg-rose-200 h-8"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Sai (0 điểm)
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* TAB 3: DIFFICULTY STATS */}
      {activeTab === "DIFFICULTY" && (
        <Card className="bg-card border-border/50 p-5 space-y-4 shadow-xs rounded-2xl">
          <div className="flex items-center justify-between">
            <h3 className="text-sm md:text-base font-bold text-foreground flex items-center gap-2">
              <BarChart2 className="h-5 w-5 text-rose-500" />
              Thống kê các câu hỏi có tỷ lệ làm sai cao nhất (% Error Rate)
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border/50 bg-muted/40 text-muted-foreground font-bold uppercase text-[11px]">
                  <th className="p-3">Bài Quiz</th>
                  <th className="p-3">Nội dung Câu hỏi</th>
                  <th className="p-3">Số lượt làm</th>
                  <th className="p-3">Số lần sai</th>
                  <th className="p-3">Tỷ lệ sai (%)</th>
                </tr>
              </thead>
              <tbody>
                {difficultyStats.map((stat) => (
                  <tr key={stat.id} className="border-b border-border/40 hover:bg-muted/30">
                    <td className="p-3 font-semibold text-foreground">{stat.quizTitle}</td>
                    <td className="p-3 text-foreground">{stat.questionText}</td>
                    <td className="p-3 font-mono text-muted-foreground">{stat.totalAttempts}</td>
                    <td className="p-3 font-mono text-rose-600 dark:text-rose-400 font-bold">{stat.errorCount}</td>
                    <td className="p-3">
                      <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-500/30 font-mono font-bold text-xs">
                        {stat.errorRatePercent}%
                      </Badge>
                    </td>
                  </tr>
                ))}
                {difficultyStats.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-muted-foreground">Chưa có dữ liệu thống kê câu hỏi.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* MODAL 1: CHẤM BÀI TẬP TỰ LUẬN */}
      <Dialog open={Boolean(selectedSubmission)} onOpenChange={(open) => !open && setSelectedSubmission(null)}>
        <DialogContent className="sm:max-w-xl p-6 space-y-4 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              Chấm điểm bài tập: {selectedSubmission?.assignmentTitle}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Học viên: <strong className="text-foreground">{selectedSubmission?.studentName}</strong> ({selectedSubmission?.studentEmail})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-xs">
            <div className="p-3.5 bg-muted/40 rounded-xl border border-border/40 space-y-1.5">
              <span className="font-bold text-foreground block">Nội dung học viên gửi:</span>
              <p className="font-mono text-foreground whitespace-pre-wrap bg-background p-3 rounded-lg border border-border/40">
                {selectedSubmission?.content}
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-foreground block">Điểm số (Tối đa {selectedSubmission?.maxScore} điểm):</label>
              <Input
                type="number"
                min={0}
                max={selectedSubmission?.maxScore || 10}
                step={0.5}
                value={gradeScore}
                onChange={(e) => setGradeScore(Number(e.target.value))}
                className="h-10 text-sm font-bold border-border/60"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-foreground block">Lời nhận xét / Góp ý sửa bài:</label>
              <Textarea
                rows={3}
                value={gradeFeedback}
                onChange={(e) => setGradeFeedback(e.target.value)}
                placeholder="Nhập lời nhận xét chi tiết giúp học viên hiểu rõ ưu/nhược điểm bài làm..."
                className="text-xs border-border/60"
              />
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-border flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setSelectedSubmission(null)} className="h-9 px-4 text-xs font-semibold rounded-xl">
              Hủy
            </Button>
            <Button size="sm" onClick={handleSubmitSubmissionGrade} disabled={gradingBusy} className="h-9 px-4 text-xs font-bold rounded-xl shadow-xs">
              Lưu kết quả chấm điểm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: XEM CHI TIẾT QUIZ FILL_BLANK */}
      <Dialog open={Boolean(selectedQuizDetail)} onOpenChange={(open) => !open && setSelectedQuizDetail(null)}>
        <DialogContent className="sm:max-w-lg p-6 space-y-4 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-primary" />
              Bài Quiz điền từ: {selectedQuizDetail?.quizTitle}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Học viên thực hiện: <strong className="text-foreground">{selectedQuizDetail?.studentName}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-foreground block">Câu hỏi:</label>
              <p className="p-3 bg-muted/50 rounded-xl border border-border text-foreground font-semibold">
                {selectedQuizDetail?.questionText}
              </p>
            </div>

            <div className="space-y-2 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800">
              <div>
                <span className="text-xs text-muted-foreground block mb-0.5">Đáp án học viên điền:</span>
                <p className="text-sm font-mono font-bold text-amber-700 dark:text-amber-300">
                  "{selectedQuizDetail?.studentAnswer}"
                </p>
              </div>
              <div className="pt-2 border-t border-amber-200 dark:border-amber-800/60">
                <span className="text-xs text-muted-foreground block mb-0.5">Đáp án chuẩn tham chiếu:</span>
                <p className="text-xs font-mono font-semibold text-foreground">
                  "{selectedQuizDetail?.correctAnswer}"
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-border flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">Tối đa: {selectedQuizDetail?.maxPoints} điểm</span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => selectedQuizDetail && handleGradeFillBlank(selectedQuizDetail.id, selectedQuizDetail.maxPoints, selectedQuizDetail.studentName)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl cursor-pointer gap-1"
              >
                <CheckCircle className="h-3.5 w-3.5" />
                Đúng ({selectedQuizDetail?.maxPoints} đ)
              </Button>
              <Button
                size="sm"
                onClick={() => selectedQuizDetail && handleGradeFillBlank(selectedQuizDetail.id, 0, selectedQuizDetail.studentName)}
                className="bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800 text-xs font-bold rounded-xl cursor-pointer gap-1 hover:bg-rose-200"
              >
                <XCircle className="h-3.5 w-3.5" />
                Sai (0 đ)
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
