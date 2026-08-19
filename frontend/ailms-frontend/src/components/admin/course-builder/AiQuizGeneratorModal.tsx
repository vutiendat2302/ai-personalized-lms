import React, { useState, useRef } from "react";
import { Sparkles, Upload, FileText, CheckCircle2, AlertCircle, Loader2, X, HelpCircle, Layers } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { httpClient } from "@/api/httpClient";
import { useToast } from "@/hooks/useToast";

interface AiQuizGeneratorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lessonId: string;
  lessonName?: string;
  onSuccess?: () => void;
}

interface DraftQuestion {
  questionText: string;
  questionType: string;
  difficulty?: string;
  explanation?: string;
  options: { optionText: string; isCorrect: boolean }[];
}

export const AiQuizGeneratorModal: React.FC<AiQuizGeneratorModalProps> = ({
  open,
  onOpenChange,
  lessonId,
  lessonName = "Bài học",
  onSuccess,
}) => {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [assessmentType, setAssessmentType] = useState<"QUIZ" | "ASSIGNMENT">("QUIZ");
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [materials, setMaterials] = useState<File[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [draftQuestions, setDraftQuestions] = useState<DraftQuestion[]>([]);
  const [applying, setApplying] = useState<boolean>(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setMaterials((prev) => [...prev, ...selectedFiles].slice(0, 3));
    }
    e.target.value = "";
  };

  const removeFile = (index: number) => {
    setMaterials((prev) => prev.filter((_, i) => i !== index));
  };

  const handleGenerateDraft = async () => {
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("assessmentType", assessmentType);
      formData.append("questionCount", String(questionCount));
      materials.forEach((file) => formData.append("materials", file));

      const res = await httpClient.post(
        `/v1/authoring/lessons/${encodeURIComponent(lessonId)}/ai-assessment-drafts`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      const draftData = res.data?.data;
      if (draftData) {
        setDraftId(draftData.draftId);
        if (draftData.quiz?.questions) {
          setDraftQuestions(draftData.quiz.questions);
        }
        toast.success("AI đã sinh bản nháp bài kiểm tra thành công!");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Không thể sinh bài kiểm tra bằng AI.");
    } finally {
      setLoading(false);
    }
  };

  const handleApplyDraft = async () => {
    if (!draftId) return;
    try {
      setApplying(true);
      await httpClient.post(`/v1/authoring/ai-assessment-drafts/${encodeURIComponent(draftId)}/apply`, {
        action: "APPLY",
      });
      toast.success("Đã áp dụng bài kiểm tra vào bài học thành công!");
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Không thể lưu bài kiểm tra.");
    } finally {
      setApplying(false);
    }
  };

  const resetModal = () => {
    setDraftId(null);
    setDraftQuestions([]);
    setMaterials([]);
  };

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
                onClick={() => setAssessmentType("QUIZ")}
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
                onClick={() => setAssessmentType("ASSIGNMENT")}
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
                  {[5, 10, 15, 20].map((count) => (
                    <Button
                      key={count}
                      type="button"
                      variant={questionCount === count ? "default" : "outline"}
                      size="sm"
                      onClick={() => setQuestionCount(count)}
                      className="text-xs h-8 px-3 rounded-lg"
                    >
                      {count} câu
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Upload Materials */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Tải lên tài liệu tham khảo bổ sung (Tối đa 3 tệp):</Label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border/80 hover:border-primary/60 rounded-xl p-4 text-center cursor-pointer transition-colors bg-muted/20 hover:bg-primary/5"
              >
                <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-1.5" />
                <p className="text-xs font-medium text-foreground">Bấm để chọn tệp tài liệu hoặc ảnh đề thi</p>
                <p className="text-[11px] text-muted-foreground">Hỗ trợ PDF, DOCX, TXT, PNG, JPG (Tối đa 20MB)</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.docx,.doc,.txt,image/*"
                className="hidden"
                onChange={handleFileChange}
              />

              {materials.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  {materials.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-lg bg-card border border-border text-xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <FileText className="h-4 w-4 text-primary shrink-0" />
                        <span className="truncate font-medium">{file.name}</span>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          ({(file.size / 1024).toFixed(0)} KB)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(idx)}
                        className="text-muted-foreground hover:text-destructive p-1 rounded-md"
                        title="Xóa tệp"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/40">
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={loading}>
                Hủy bỏ
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleGenerateDraft}
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
            <div className="space-y-3 max-h-[45vh] overflow-y-auto pr-1">
              {draftQuestions.map((q, qIdx) => (
                <Card key={qIdx} className="p-3 bg-card border border-border/60 rounded-xl space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="h-5 w-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                      {qIdx + 1}
                    </span>
                    <p className="text-xs font-medium text-foreground">{q.questionText}</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pl-7">
                    {q.options?.map((opt, oIdx) => (
                      <div
                        key={oIdx}
                        className={`p-2 rounded-lg text-xs flex items-center gap-2 border ${
                          opt.isCorrect
                            ? "bg-primary/10 border-primary/40 font-medium text-primary"
                            : "bg-muted/30 border-border/50 text-muted-foreground"
                        }`}
                      >
                        <span className="font-bold">{String.fromCharCode(65 + oIdx)}.</span>
                        <span>{opt.optionText}</span>
                        {opt.isCorrect && <CheckCircle2 className="h-3.5 w-3.5 text-primary ml-auto shrink-0" />}
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

            {/* Confirm Apply Buttons */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/40">
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={applying}>
                Đóng
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleApplyDraft}
                disabled={applying}
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
