import React, { useState, useEffect } from "react";
import { teacherApi, type SubmissionItem } from "@/api/teacher/teacherApi";
import { GradingQueueItem } from "@/components/teacher/GradingQueueItem";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/useToast";
import { ClipboardList, CheckCircle2 } from "lucide-react";

export const TeacherGradingAssignmentsPage: React.FC = () => {
  const { success } = useToast();
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"UNGRADED" | "GRADED">("UNGRADED");

  useEffect(() => {
    teacherApi.getAssignmentSubmissions().then((res) => {
      setSubmissions(res);
      setLoading(false);
    });
  }, []);

  const handleGrade = async (sub: SubmissionItem, score: number, feedback: string) => {
    await teacherApi.gradeSubmission(sub.id, score, feedback);
    success(`Đã chấm điểm ${score}/${sub.maxScore} cho ${sub.studentName}!`);
    setSubmissions((prev) => prev.filter((s) => s.id !== sub.id));
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-muted-foreground">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-xs font-semibold">Đang tải hàng đợi bài tập chờ chấm...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <ClipboardList className="h-6 w-6 text-primary" />
          Chấm bài tập về nhà (Assignment Queue)
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Hàng đợi bài nộp của học viên. Chấm điểm & nhận xét xong hệ thống tự động nhảy sang bài tiếp theo.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/40">
        <button
          onClick={() => setActiveTab("UNGRADED")}
          className={`px-4 py-2.5 text-xs font-bold transition border-b-2 cursor-pointer ${
            activeTab === "UNGRADED"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Bài chờ chấm ({submissions.length})
        </button>
      </div>

      {/* Queue List */}
      {submissions.length === 0 ? (
        <Card className="bg-card border-border/40 p-12 text-center text-muted-foreground space-y-2 shadow-xs">
          <CheckCircle2 className="h-8 w-8 text-primary mx-auto" />
          <p className="text-sm font-bold text-foreground">Tuyệt vời! Bạn đã hoàn thành chấm tất cả bài tập trong hàng đợi.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {submissions.map((sub) => (
            <GradingQueueItem key={sub.id} submission={sub} onGrade={handleGrade} />
          ))}
        </div>
      )}
    </div>
  );
};
