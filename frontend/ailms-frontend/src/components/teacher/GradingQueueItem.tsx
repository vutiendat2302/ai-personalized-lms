import React from "react";
import { Button } from "@/components/ui/button";

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

export const GradingQueueItem: React.FC<GradingQueueItemProps> = ({
  submission,
  onGrade,
}) => {
  const [score, setScore] = React.useState<number>(submission.maxScore);
  const [feedback, setFeedback] = React.useState("");

  return (
    <div className="p-4 bg-card border border-border/40 rounded-xl space-y-3 shadow-xs">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-foreground">{submission.studentName}</span>
          <span className="text-[11px] text-muted-foreground block">{submission.className} — {submission.assignmentTitle}</span>
        </div>
        {submission.isLate && (
          <span className="px-2 py-0.5 text-[10px] font-extrabold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 rounded border border-rose-300 dark:border-rose-800">
            Nộp trễ
          </span>
        )}
      </div>

      <div className="p-3 bg-muted/40 rounded-lg text-xs font-mono text-foreground border border-border/40 max-h-28 overflow-y-auto">
        {submission.content}
      </div>

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
          <button
            type="button"
            onClick={() => setScore(submission.maxScore)}
            className="px-2 py-1 text-[10px] font-bold bg-primary/10 text-primary rounded border border-primary/20 hover:bg-primary/20 cursor-pointer"
          >
            Tối đa
          </button>
          <button
            type="button"
            onClick={() => setScore(0)}
            className="px-2 py-1 text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 rounded border border-rose-300 dark:border-rose-800 cursor-pointer"
          >
            0 điểm
          </button>
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
