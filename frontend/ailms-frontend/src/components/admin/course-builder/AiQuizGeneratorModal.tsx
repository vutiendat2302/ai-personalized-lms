import React, { useCallback, useState, useRef } from "react";
import { Sparkles, Upload, FileText, CheckCircle2, Loader2, X, HelpCircle, Layers } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/useToast";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { aiAssessmentApi, type AiAssessmentMaterial, type AiDraftQuestion } from "@/api/ai/aiAssessmentApi";
import { teacherApi, type TeacherClassCard } from "@/api/teacher/teacherApi";

interface AiQuizGeneratorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lessonId: string;
  lessonName?: string;
  onSuccess?: () => void;
}

/** Lấy thông báo nghiệp vụ an toàn từ lỗi HTTP mà không dùng kiểu any. */
const apiErrorMessage = (error: unknown, fallback: string): string => {
  if (typeof error !== "object" || error === null || !("response" in error)) return fallback;
  const response = (error as { response?: { data?: { message?: unknown } } }).response;
  return typeof response?.data?.message === "string" ? response.data.message : fallback;
};

export const AiQuizGeneratorModal: React.FC<AiQuizGeneratorModalProps> = ({
  open,
  onOpenChange,
  lessonId,
  lessonName = "Bài học",
  onSuccess,
}) => {
  const { error: showError, success: showSuccess } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [assessmentType, setAssessmentType] = useState<"QUIZ" | "ASSIGNMENT">("QUIZ");
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [materials, setMaterials] = useState<File[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftQuestions, setDraftQuestions] = useState<AiDraftQuestion[]>([]);
  const [draftSources, setDraftSources] = useState<{ sourceId: string; title: string }[]>([]);
  const [applying, setApplying] = useState<boolean>(false);
  const [classes, setClasses] = useState<TeacherClassCard[]>([]);
  const [classesLoading, setClassesLoading] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [classMaterials, setClassMaterials] = useState<AiAssessmentMaterial[]>([]);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [selectedResourceIds, setSelectedResourceIds] = useState<string[]>([]);
  const [publishAfterApply, setPublishAfterApply] = useState(false);
  const [availableFrom, setAvailableFrom] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [maxAttempts, setMaxAttempts] = useState(3);
  const [showResultAfterSubmit, setShowResultAfterSubmit] = useState(true);

  /** Tải danh sách lớp thật giáo viên đang quản lý. */
  const loadClasses = useCallback(async () => {
    setClassesLoading(true);
    try {
      setClasses(await teacherApi.getClasses());
    } catch {
      setClasses([]);
      showError("Không thể tải danh sách lớp đang phụ trách.");
    } finally {
      setClassesLoading(false);
    }
  }, [showError]);

  /** Tải tài liệu RAG của lớp đã chọn. */
  const loadClassMaterials = useCallback(async (classId: string) => {
    setMaterialsLoading(true);
    try {
      setClassMaterials(await aiAssessmentApi.getMaterials(lessonId, classId));
    } catch {
      setClassMaterials([]);
      showError("Lớp đã chọn không thuộc khóa học này hoặc bạn không có quyền sử dụng tài liệu.");
    } finally {
      setMaterialsLoading(false);
    }
  }, [lessonId, showError]);

  /** Đổi lớp, xóa lựa chọn cũ và tải resource của lớp mới. */
  const changeSelectedClass = (classId: string) => {
    setSelectedClassId(classId);
    setSelectedResourceIds([]);
    setClassMaterials([]);
    void loadClassMaterials(classId);
  };

  /** Kiểm tra và thêm tối đa ba file upload tạm thời. */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const allowedTypes = new Set([
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "image/png",
        "image/jpeg",
      ]);
      const selectedFiles = Array.from(e.target.files).filter((file) => {
        if (!allowedTypes.has(file.type)) {
          showError(`${file.name}: chỉ hỗ trợ PDF, DOCX, PNG hoặc JPEG.`);
          return false;
        }
        if (file.size > 10 * 1024 * 1024) {
          showError(`${file.name}: kích thước tối đa 10 MB.`);
          return false;
        }
        return true;
      });
      setMaterials((prev) => [...prev, ...selectedFiles].slice(0, 3));
    }
    e.target.value = "";
  };

  /** Xóa một file upload tạm khỏi request sinh draft. */
  const removeFile = (index: number) => {
    setMaterials((prev) => prev.filter((_, i) => i !== index));
  };

  /** Sinh draft có cấu trúc từ các RAG source đã chọn và file upload tạm. */
  const handleGenerateDraft = async () => {
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("assessmentType", assessmentType);
      formData.append("questionCount", String(questionCount));
      if (selectedClassId) formData.append("classId", selectedClassId);
      selectedResourceIds.forEach((id) => {
        formData.append("resourceIds", id);
      });
      materials.forEach((file) => {
        formData.append("materials", file);
      });

      const draftData = await aiAssessmentApi.generateDraft(lessonId, formData);
      setDraftId(draftData.draftId);
      if (draftData.quiz?.questions) {
        setDraftTitle(draftData.quiz.title);
        setDraftQuestions(draftData.quiz.questions);
      }
      setDraftSources(draftData.sources ?? []);
      showSuccess("AI đã sinh bản nháp bài kiểm tra thành công!");
    } catch (error: unknown) {
      showError(apiErrorMessage(error, "Không thể sinh bài kiểm tra bằng AI."));
    } finally {
      setLoading(false);
    }
  };

  /** Lưu bản review và tùy chọn phát hành Quiz vừa tạo vào lớp. */
  const handleApplyDraft = async () => {
    if (!draftId) return;
    try {
      setApplying(true);
      const applied = await aiAssessmentApi.applyDraft(draftId, {
        applyQuiz: assessmentType === "QUIZ",
        applyAssignment: assessmentType === "ASSIGNMENT",
        quiz: assessmentType === "QUIZ" ? { title: draftTitle.trim(), questions: draftQuestions } : undefined,
      });
      if (publishAfterApply && assessmentType === "QUIZ") {
        if (!selectedClassId || !applied.quiz?.id) {
          throw new Error("Cần chọn lớp để phát hành Quiz");
        }
        try {
          await aiAssessmentApi.publishQuiz(selectedClassId, applied.quiz.id, {
            availableFrom: availableFrom.length > 0 ? availableFrom : undefined,
            dueAt: dueAt.length > 0 ? dueAt : undefined,
            maxAttempts,
            showResultAfterSubmit,
          });
          showSuccess("Đã lưu và phát hành Quiz vào lớp thành công!");
        } catch {
          showError("Quiz đã được lưu nhưng chưa thể phát hành vào lớp. Bạn có thể dùng nút Giao lớp trong thư viện Quiz.");
        }
      } else {
        showSuccess("Đã áp dụng assessment vào bài học thành công!");
      }
      onOpenChange(false);
      onSuccess?.();
    } catch (error: unknown) {
      showError(apiErrorMessage(error, "Không thể lưu bài kiểm tra."));
    } finally {
      setApplying(false);
    }
  };

  /** Xóa toàn bộ trạng thái tạm khi đóng luồng sinh assessment. */
  const resetModal = () => {
    setDraftId(null);
    setDraftTitle("");
    setDraftQuestions([]);
    setDraftSources([]);
    setMaterials([]);
    setSelectedResourceIds([]);
    setClassMaterials([]);
    setSelectedClassId("");
    setPublishAfterApply(false);
    setAvailableFrom("");
    setDueAt("");
    setMaxAttempts(3);
    setShowResultAfterSubmit(true);
  };

  /** Cập nhật một trường của câu hỏi trong bản review mà không thay đổi các câu còn lại. */
  const updateDraftQuestion = (questionIndex: number, patch: Partial<AiDraftQuestion>) => {
    setDraftQuestions((previous) => previous.map((question, index) =>
      index === questionIndex ? { ...question, ...patch } : question));
  };

  /** Cập nhật nội dung một phương án của câu hỏi đang review. */
  const updateDraftOption = (questionIndex: number, optionIndex: number, content: string) => {
    setDraftQuestions((previous) => previous.map((question, index) => index !== questionIndex ? question : {
      ...question,
      options: question.options.map((option, currentOptionIndex) =>
        currentOptionIndex === optionIndex ? { ...option, content } : option),
    }));
  };

  /** Chọn đáp án đúng và giữ đúng một đáp án với câu hỏi single/true-false. */
  const toggleDraftCorrectOption = (questionIndex: number, optionIndex: number) => {
    setDraftQuestions((previous) => previous.map((question, index) => index !== questionIndex ? question : {
      ...question,
      options: question.options.map((option, currentOptionIndex) => ({
        ...option,
        isCorrect: question.questionType === "MULTIPLE_CHOICE"
          ? currentOptionIndex === optionIndex ? !option.isCorrect : option.isCorrect
          : currentOptionIndex === optionIndex,
      })),
    }));
  };

  const publishScheduleInvalid = Boolean(availableFrom && dueAt
    && new Date(dueAt).getTime() <= new Date(availableFrom).getTime());
  const quizDraftInvalid = !draftTitle.trim() || draftQuestions.some((question) => {
    const correctCount = question.options.filter((option) => option.isCorrect).length;
    const correctAnswerInvalid = question.questionType === "MULTIPLE_CHOICE"
      ? correctCount < 1
      : correctCount !== 1;
    return !question.content.trim()
      || question.options.some((option) => !option.content.trim())
      || correctAnswerInvalid;
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) resetModal();
      }}
    >
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <Sparkles className="h-5 w-5 text-primary" />
            Sinh Bài Kiểm Tra Tự Động Bằng AI
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Dựa trên nội dung bài học &quot;{lessonName}&quot; và tài liệu đính kèm (PDF, Word, ảnh đề thi).
          </DialogDescription>
        </DialogHeader>

        {!draftId ? (
          <div className="space-y-4 py-2">
            {/* Type selection */}
            <div className="grid grid-cols-2 gap-3">
              <Card
                className={`p-3 cursor-pointer border transition-all ${
                  assessmentType === "QUIZ"
                    ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                    : "border-border hover:border-primary/40"
                }`}
                onClick={() => { setAssessmentType("QUIZ"); }}
              >
                <div className="flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold">Trắc nghiệm (Quiz)</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Bộ câu hỏi 4 lựa chọn có đáp án đúng và giải thích chi tiết.
                </p>
              </Card>

              <Card
                className={`p-3 cursor-pointer border transition-all ${
                  assessmentType === "ASSIGNMENT"
                    ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                    : "border-border hover:border-primary/40"
                }`}
                onClick={() => { setAssessmentType("ASSIGNMENT"); }}
              >
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold">Tự luận (Assignment)</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Đề bài thực hành kèm bảng tiêu chí chấm điểm (Rubrics).
                </p>
              </Card>
            </div>

            {/* Question count */}
            {assessmentType === "QUIZ" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Số lượng câu hỏi:</Label>
                <div className="flex items-center gap-2">
                  {[5, 10, 15].map((count) => (
                    <Button
                      key={count}
                      type="button"
                      variant={questionCount === count ? "default" : "outline"}
                      size="sm"
                      onClick={() => { setQuestionCount(count); }}
                      className="text-xs h-8 px-3 rounded-lg"
                    >
                      {count} câu
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2 rounded-xl border p-3">
              <Label className="text-xs font-medium">Tài liệu đã có trong lớp</Label>
              <Select
                value={selectedClassId}
                onValueChange={changeSelectedClass}
                onOpenChange={(value) => {
                  if (value && classes.length === 0) {
                    void loadClasses();
                  }
                }}
                disabled={classesLoading}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder={classesLoading ? "Đang tải lớp..." : "Chọn lớp học"} />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.className} — {item.courseName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedClassId && (
                <div className="max-h-36 space-y-1 overflow-y-auto rounded-lg bg-muted/20 p-2">
                  {materialsLoading ? (
                    <p className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang tải tài liệu...</p>
                  ) : classMaterials.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Lớp chưa có tài liệu có thể dùng cho AI.</p>
                  ) : classMaterials.map((item) => (
                    <label key={item.id} className="flex items-center gap-2 rounded-md p-2 hover:bg-muted/50">
                      <Checkbox
                        checked={selectedResourceIds.includes(item.id)}
                        disabled={!item.canUseForAi}
                        onCheckedChange={() => {
                          setSelectedResourceIds((previous) => previous.includes(item.id)
                            ? previous.filter((id) => id !== item.id)
                            : [...previous, item.id]);
                        }}
                      />
                      <span className="min-w-0 flex-1 truncate text-xs">{item.title || item.fileName}</span>
                      <span className="text-[10px] text-muted-foreground">{item.ragStatus}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Upload Materials */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Tải lên tài liệu tham khảo bổ sung (Tối đa 3 tệp):</Label>
              <div
                onClick={() => { fileInputRef.current?.click(); }}
                className="border-2 border-dashed border-border/80 hover:border-primary/60 rounded-xl p-4 text-center cursor-pointer transition-colors bg-muted/20 hover:bg-primary/5"
              >
                <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-1.5" />
                <p className="text-xs font-medium text-foreground">Bấm để chọn tệp tài liệu hoặc ảnh đề thi</p>
                <p className="text-[11px] text-muted-foreground">Hỗ trợ PDF, DOCX, PNG, JPG (mỗi file tối đa 10 MB)</p>
              </div>
              <Input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.docx,.png,.jpg,.jpeg"
                className="hidden"
                onChange={handleFileChange}
              />

              {materials.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  {materials.map((file, idx) => (
                    <div
                      key={`${file.name}-${String(file.size)}-${String(file.lastModified)}`}
                      className="flex items-center justify-between p-2 rounded-lg bg-card border border-border text-xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <FileText className="h-4 w-4 text-primary shrink-0" />
                        <span className="truncate font-medium">{file.name}</span>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          ({(file.size / 1024).toFixed(0)} KB)
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => { removeFile(idx); }}
                        className="text-muted-foreground hover:text-destructive"
                        title="Xóa tệp"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/40">
              <Button variant="outline" size="sm" onClick={() => { onOpenChange(false); }} disabled={loading}>
                Hủy bỏ
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => { void handleGenerateDraft(); }}
                disabled={loading}
                className="flex items-center gap-1.5"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                <span>{loading ? "AI Đang Soạn Đề..." : "Bắt Đầu Sinh Bằng AI"}</span>
              </Button>
            </div>
          </div>
        ) : (
          /* Preview Draft Section */
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between bg-primary/10 p-2.5 rounded-xl border border-primary/20">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-xs font-semibold text-foreground">Bản xem trước đề thi AI vừa sinh</p>
                  <p className="text-[11px] text-muted-foreground">
                    Tổng cộng {draftQuestions.length} câu hỏi. Hãy kiểm tra trước khi lưu.
                  </p>
                </div>
              </div>
              <Button variant="outline" size="xs" onClick={resetModal}>
                Tạo lại
              </Button>
            </div>

            {/* Questions list */}
            {assessmentType === "QUIZ" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Tiêu đề Quiz sau khi lưu</Label>
                <Input value={draftTitle} maxLength={255} onChange={(event) => { setDraftTitle(event.target.value); }} />
              </div>
            )}
            <div className="space-y-3 max-h-[45vh] overflow-y-auto pr-1">
              {draftQuestions.map((q, qIdx) => (
                <Card key={`${q.content}-${String(qIdx)}`} className="p-3 bg-card border border-border/60 rounded-xl space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="h-5 w-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                      {qIdx + 1}
                    </span>
                    <Input
                      value={q.content}
                      maxLength={5000}
                      onChange={(event) => { updateDraftQuestion(qIdx, { content: event.target.value }); }}
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pl-7">
                    {q.options.map((opt, oIdx) => (
                      <div
                        key={`${opt.content}-${String(oIdx)}`}
                        className={`p-2 rounded-lg text-xs flex items-center gap-2 border ${
                          opt.isCorrect
                            ? "bg-primary/10 border-primary/40 font-medium text-primary"
                            : "bg-muted/30 border-border/50 text-muted-foreground"
                        }`}
                      >
                        <span className="font-bold">{String.fromCharCode(65 + oIdx)}.</span>
                        <Checkbox
                          checked={opt.isCorrect}
                          onCheckedChange={() => { toggleDraftCorrectOption(qIdx, oIdx); }}
                          aria-label={`Đáp án đúng ${String.fromCharCode(65 + oIdx)}`}
                        />
                        <Input
                          value={opt.content}
                          maxLength={2000}
                          onChange={(event) => { updateDraftOption(qIdx, oIdx, event.target.value); }}
                          className="h-7 border-0 bg-transparent px-1 text-xs shadow-none"
                        />
                      </div>
                    ))}
                  </div>

                  {q.explanation && (
                    <div className="pl-7 pt-1 text-[11px] text-muted-foreground bg-muted/20 p-2 rounded-lg">
                      <span className="font-semibold text-foreground">Giải thích: </span>
                      {q.explanation}
                    </div>
                  )}
                </Card>
              ))}
            </div>

            {draftSources.length > 0 && (
              <div className="rounded-xl border bg-muted/20 p-3">
                <p className="mb-1 text-xs font-semibold">Nguồn AI đã sử dụng</p>
                {draftSources.map((source) => <p key={source.sourceId} className="text-[11px] text-muted-foreground">• {source.title}</p>)}
              </div>
            )}

            {assessmentType === "QUIZ" && selectedClassId && (
              <div className="space-y-3 rounded-xl border p-3">
                <label className="flex items-center gap-2 text-xs font-medium">
                  <Checkbox checked={publishAfterApply} onCheckedChange={(checked) => { setPublishAfterApply(checked); }} />
                  Phát hành Quiz vào lớp ngay sau khi lưu
                </label>
                {publishAfterApply && (
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="space-y-1"><Label className="text-[11px]">Mở từ</Label><Input type="datetime-local" value={availableFrom} onChange={(event) => { setAvailableFrom(event.target.value); }} /></div>
                    <div className="space-y-1"><Label className="text-[11px]">Hạn nộp</Label><Input type="datetime-local" value={dueAt} onChange={(event) => { setDueAt(event.target.value); }} /></div>
                    <div className="space-y-1"><Label className="text-[11px]">Số lần làm</Label><Input type="number" min={1} max={20} value={maxAttempts} onChange={(event) => { setMaxAttempts(Number(event.target.value)); }} /></div>
                  </div>
                )}
                {publishAfterApply && publishScheduleInvalid && (
                  <p className="text-xs text-destructive">Hạn nộp phải sau thời điểm mở Quiz.</p>
                )}
                {publishAfterApply && (
                  <label className="flex items-center gap-2 text-xs">
                    <Checkbox checked={showResultAfterSubmit} onCheckedChange={(checked) => { setShowResultAfterSubmit(checked); }} />
                    Cho học viên xem điểm ngay sau khi nộp
                  </label>
                )}
              </div>
            )}

            {/* Confirm Apply Buttons */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/40">
              <Button variant="outline" size="sm" onClick={() => { onOpenChange(false); }} disabled={applying}>
                Đóng
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => { void handleApplyDraft(); }}
                disabled={applying || publishScheduleInvalid
                  || (assessmentType === "QUIZ" && quizDraftInvalid)}
                className="flex items-center gap-1.5"
              >
                {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                <span>{applying ? "Đang lưu..." : "Áp Dụng Vào Bài Học"}</span>
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
