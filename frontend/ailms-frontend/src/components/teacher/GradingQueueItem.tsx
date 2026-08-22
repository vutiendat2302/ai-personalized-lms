import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Eye, FileText, Download, User, Clock, CheckCircle2 } from "lucide-react";

export interface SubmissionItem {
  id: string;
  studentName: string;
  studentEmail: string;
  assignmentTitle: string;
  className: string;
  submittedAt: string;
  isLate: boolean;
  content: string;
  attachmentUrl?: string;
  maxScore: number;
}

interface GradingQueueItemProps {
  submission: SubmissionItem;
  onGrade: (submission: SubmissionItem, score: number, feedback: string) => void;
}

/**
 * Component hiển thị thẻ bài tập nộp trong hàng đợi chấm điểm của giảng viên kèm modal xem chi tiết bài làm.
 */
export const GradingQueueItem: React.FC<GradingQueueItemProps> = ({
  submission,
  onGrade,
}) => {
  const [score, setScore] = useState<number>(submission.maxScore);
  const [feedback, setFeedback] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  /** Thực hiện lưu kết quả chấm điểm và đóng modal xem chi tiết. */
  const handleSaveGrade = () => {
    onGrade(submission, score, feedback);
    setIsOpen(false);
  };

  return (
    <div className="p-4 bg-card border border-border/40 rounded-xl space-y-3 shadow-xs">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-primary" />
            {submission.studentName} ({submission.studentEmail})
          </span>
          <span className="text-[11px] text-muted-foreground block mt-0.5">
            {submission.className} — <strong className="text-foreground">{submission.assignmentTitle}</strong>
          </span>
        </div>
        <div className="flex items-center gap-2">
          {submission.isLate ? (
            <span className="px-2 py-0.5 text-[10px] font-extrabold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 rounded border border-rose-300 dark:border-rose-800">
              Nộp trễ
            </span>
          ) : (
            <span className="px-2 py-0.5 text-[10px] font-extrabold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 rounded border border-emerald-300 dark:border-emerald-800">
              Đúng hạn
            </span>
          )}

          {/* Button Mở xem chi tiết bài làm của học viên */}
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2.5 text-xs font-bold gap-1.5 border-primary/30 text-primary hover:bg-primary/10 cursor-pointer"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Mở xem bài làm
                </Button>
              }
            />
            <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col p-6 space-y-4">
              <DialogHeader>
                <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Chi tiết bài nộp của học viên {submission.studentName}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Lớp: <strong className="text-foreground">{submission.className}</strong> | Bài tập: <strong className="text-foreground">{submission.assignmentTitle}</strong>
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 overflow-y-auto pr-1 flex-1">
                {/* Thông tin học viên & Thời gian nộp */}
                <div className="p-3 bg-muted/40 rounded-xl border border-border/40 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-primary" />
                      Học viên: <strong className="text-foreground">{submission.studentName}</strong> ({submission.studentEmail})
                    </span>
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {submission.submittedAt}
                    </span>
                  </div>
                </div>

                {/* Nội dung bài nộp chi tiết của học viên */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground block">
                    Nội dung bài làm / Bài nộp của học viên:
                  </label>
                  <div className="p-4 bg-muted/50 rounded-xl text-xs font-mono text-foreground border border-border whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto select-text">
                    {submission.content || "Học viên không gửi văn bản nội dung kèm theo."}
                  </div>
                </div>

                {/* File đính kèm nếu có */}
                {submission.attachmentUrl && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground block">Tệp đính kèm bài làm:</label>
                    <a
                      href={submission.attachmentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 p-2.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-xl text-xs font-bold transition"
                    >
                      <Download className="h-4 w-4" />
                      Tải xuống tệp đính kèm ({submission.attachmentUrl.split("/").pop() || "File bài làm"})
                    </a>
                  </div>
                )}

                {/* Khu vực chấm điểm & Nhận xét trong dialog */}
                <div className="p-4 bg-card border border-border rounded-xl space-y-3">
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Chấm điểm & Ghi nhận xét
                  </h4>
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-medium text-muted-foreground">Điểm (/{submission.maxScore}):</label>
                      <input
                        type="number"
                        min={0}
                        max={submission.maxScore}
                        value={score}
                        onChange={(e) => setScore(Number(e.target.value))}
                        className="w-16 h-8 text-xs font-bold bg-background border border-border rounded text-center text-primary"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setScore(submission.maxScore)}
                        className="h-7 text-[10px] font-bold bg-primary/10 text-primary border-primary/20 cursor-pointer"
                      >
                        Tối đa
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setScore(0)}
                        className="h-7 text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border-rose-300 cursor-pointer"
                      >
                        0 điểm
                      </Button>
                    </div>

                    <input
                      type="text"
                      placeholder="Nhập nhận xét chi tiết..."
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      className="h-8 text-xs bg-background border border-border rounded px-3 text-foreground flex-1 w-full"
                    />
                  </div>
                </div>
              </div>

              <DialogFooter className="pt-2 border-t border-border">
                <Button
                  size="sm"
                  onClick={handleSaveGrade}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold rounded-lg gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Xác nhận Chấm bài & Đóng
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Tóm tắt bài nộp ngắn */}
      <div className="p-3 bg-muted/40 rounded-lg text-xs font-mono text-foreground border border-border/40 max-h-24 overflow-y-auto whitespace-pre-wrap">
        {submission.content}
      </div>

      {/* Thanh chấm bài nhanh trên Card */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-border/40">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <label className="text-xs text-muted-foreground font-medium">Điểm (/{submission.maxScore}):</label>
          <input
            type="number"
            min={0}
            max={submission.maxScore}
            value={score}
            onChange={(e) => setScore(Number(e.target.value))}
            className="w-16 h-8 text-xs font-bold bg-background border border-border rounded text-center text-primary"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setScore(submission.maxScore)}
            className="h-7 px-2 text-[10px] font-bold bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 cursor-pointer"
          >
            Tối đa
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setScore(0)}
            className="h-7 px-2 text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border-rose-300 dark:border-rose-800 cursor-pointer"
          >
            0 điểm
          </Button>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <input
            type="text"
            placeholder="Nhận xét ngắn..."
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            className="h-8 text-xs bg-background border border-border rounded px-2.5 text-foreground flex-1 sm:w-48"
          />
          <Button
            size="sm"
            onClick={() => onGrade(submission, score, feedback)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold h-8 rounded-lg cursor-pointer shrink-0"
          >
            Lưu & Tới bài sau
          </Button>
        </div>
      </div>
    </div>
  );
};
