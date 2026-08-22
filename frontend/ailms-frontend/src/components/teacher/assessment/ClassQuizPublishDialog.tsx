import { useEffect, useMemo, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { aiAssessmentApi } from "@/api/ai/aiAssessmentApi";
import { teacherApi, type TeacherClassCard } from "@/api/teacher/teacherApi";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/useToast";

interface ClassQuizPublishDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quizId: string;
  quizTitle: string;
  courseId?: string;
  onPublished?: () => void;
}

/** Cho phép giáo viên phát hành một Quiz thư viện thành bản độc lập của lớp. */
export const ClassQuizPublishDialog = ({
  open,
  onOpenChange,
  quizId,
  quizTitle,
  courseId,
  onPublished,
}: ClassQuizPublishDialogProps) => {
  const { error: showError, success: showSuccess } = useToast();
  const [classes, setClasses] = useState<TeacherClassCard[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [availableFrom, setAvailableFrom] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [maxAttempts, setMaxAttempts] = useState(3);
  const [showResultAfterSubmit, setShowResultAfterSubmit] = useState(true);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);

  const eligibleClasses = useMemo(() => classes.filter((item) =>
    !courseId || !item.courseId || item.courseId === courseId), [classes, courseId]);

  /** Tải danh sách lớp thật mỗi khi mở hộp thoại phát hành. */
  useEffect(() => {
    if (!open) return;
    teacherApi.getClasses()
      .then(setClasses)
      .catch(() => {
        setClasses([]);
        showError("Không thể tải danh sách lớp đang phụ trách.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [open, showError]);

  /** Gọi Backend sao chép Quiz và áp dụng lịch làm bài cho lớp đã chọn. */
  const publish = async () => {
    if (!selectedClassId) return;
    setPublishing(true);
    try {
      await aiAssessmentApi.publishQuiz(selectedClassId, quizId, {
        title: quizTitle,
        availableFrom: availableFrom || undefined,
        dueAt: dueAt || undefined,
        maxAttempts,
        showResultAfterSubmit,
      });
      showSuccess("Đã phát hành Quiz vào lớp.");
      onOpenChange(false);
      onPublished?.();
    } catch {
      showError("Không thể phát hành Quiz vào lớp. Hãy kiểm tra quyền, khóa học và trạng thái phát hành.");
    } finally {
      setPublishing(false);
    }
  };

  /** Đóng dialog và xóa cấu hình để lần mở sau không dùng nhầm lớp cũ. */
  const changeOpen = (value: boolean) => {
    onOpenChange(value);
    if (!value) {
      setSelectedClassId("");
      setAvailableFrom("");
      setDueAt("");
      setMaxAttempts(3);
      setShowResultAfterSubmit(true);
    }
  };

  const scheduleInvalid = Boolean(availableFrom && dueAt
    && new Date(dueAt).getTime() <= new Date(availableFrom).getTime());

  return <Dialog open={open} onOpenChange={changeOpen}>
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2"><Send className="h-5 w-5 text-primary" />Phát hành Quiz vào lớp</DialogTitle>
        <DialogDescription>{quizTitle}</DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>Lớp nhận Quiz</Label>
          <Select value={selectedClassId} onValueChange={setSelectedClassId} disabled={loading}>
            <SelectTrigger><SelectValue placeholder={loading ? "Đang tải lớp..." : "Chọn lớp cùng khóa học"} /></SelectTrigger>
            <SelectContent>
              {eligibleClasses.map((item) => <SelectItem key={item.id} value={item.id}>{item.className} — {item.courseName}</SelectItem>)}
            </SelectContent>
          </Select>
          {!loading && eligibleClasses.length === 0 && <p className="text-xs text-muted-foreground">Không có lớp phù hợp để phát hành.</p>}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5"><Label>Mở từ</Label><Input type="datetime-local" value={availableFrom} onChange={(event) => { setAvailableFrom(event.target.value); }} /></div>
          <div className="space-y-1.5"><Label>Hạn nộp</Label><Input type="datetime-local" value={dueAt} onChange={(event) => { setDueAt(event.target.value); }} /></div>
        </div>
        {scheduleInvalid && <p className="text-xs text-destructive">Hạn nộp phải sau thời điểm mở Quiz.</p>}
        <div className="space-y-1.5"><Label>Số lượt làm tối đa</Label><Input type="number" min={1} max={20} value={maxAttempts} onChange={(event) => { setMaxAttempts(Number(event.target.value)); }} /></div>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={showResultAfterSubmit} onCheckedChange={(checked) => { setShowResultAfterSubmit(checked); }} />
          Cho học viên xem điểm ngay sau khi nộp
        </label>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => { changeOpen(false); }} disabled={publishing}>Hủy</Button>
        <Button onClick={() => void publish()} disabled={!selectedClassId || publishing || scheduleInvalid || maxAttempts < 1 || maxAttempts > 20}>
          {publishing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Phát hành
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
};
