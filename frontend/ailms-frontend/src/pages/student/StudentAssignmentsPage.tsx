import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckSquare, FileCheck } from "lucide-react";
import { studentApi, type StudentAssignmentItem, type StudentQuizItem } from "@/api/student/studentApi";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StudentPageSkeleton } from "@/components/student/StudentPageSkeleton";

type Filter = "ALL" | "ASSIGNMENT" | "QUIZ";

/** Hiển thị bài tập và quiz cần hoàn thành từ API của học viên. */
export const StudentAssignmentsPage: React.FC = () => {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<StudentAssignmentItem[]>([]);
  const [quizzes, setQuizzes] = useState<StudentQuizItem[]>([]);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /** Tải song song bài tập và quiz thuộc enrollment/lớp của học viên. */
  useEffect(() => {
    Promise.all([studentApi.getAssignments(), studentApi.getQuizzes()])
      .then(([assignmentData, quizData]) => {
        setAssignments(assignmentData);
        setQuizzes(quizData);
      })
      .catch(() => setError("Không thể tải bài tập và quiz cần hoàn thành."))
      .finally(() => setLoading(false));
  }, []);

  const count = useMemo(() => filter === "ASSIGNMENT" ? assignments.length
    : filter === "QUIZ" ? quizzes.length : assignments.length + quizzes.length, [filter, assignments, quizzes]);

  /** Định dạng deadline và giữ trạng thái không có hạn nộp. */
  const deadline = (value?: string) => value
    ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
    : "Không giới hạn";

  if (loading) return <StudentPageSkeleton cards={4} columns={2} />;
  if (error) return <Card className="p-10 text-center text-sm text-destructive">{error}</Card>;

  return (
    <div className="space-y-6 pb-16">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
          <CheckSquare className="h-6 w-6 text-primary" /> Bài tập cần nộp & Quiz
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">Dữ liệu được giới hạn theo khóa học và lớp bạn đang tham gia.</p>
      </div>

      <div className="flex gap-2">
        {(["ALL", "ASSIGNMENT", "QUIZ"] as Filter[]).map((value) => (
          <Button key={value} size="sm" variant={filter === value ? "default" : "outline"} onClick={() => setFilter(value)}>
            {value === "ALL" ? "Tất cả" : value === "ASSIGNMENT" ? "Bài tập" : "Quiz"}
          </Button>
        ))}
      </div>

      {count === 0 ? (
        <Card className="p-12 text-center text-sm text-muted-foreground">Không có nội dung cần hoàn thành.</Card>
      ) : <div className="space-y-3">
        {filter !== "QUIZ" && assignments.map((item) => (
          <Card key={`assignment-${item.id}`} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
            <CheckSquare className="h-5 w-5 shrink-0 text-primary" />
            <div className="flex-1">
              <div className="text-xs font-semibold text-primary">BÀI TẬP · {item.status}</div>
              <h2 className="font-bold text-foreground">{item.title}</h2>
              <p className="text-xs text-muted-foreground">{item.courseName} · Hạn nộp: {deadline(item.dueDate)}</p>
            </div>
            <div className="text-xs text-muted-foreground">Điểm: {item.score ?? "—"}/{item.maxScore ?? "—"}</div>
            <Button size="sm" onClick={() => navigate(`/learn/courses/${item.courseId}`)}>Mở không gian học</Button>
          </Card>
        ))}

        {filter !== "ASSIGNMENT" && quizzes.map((item) => (
          <Card key={`quiz-${item.id}`} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
            <FileCheck className="h-5 w-5 shrink-0 text-primary" />
            <div className="flex-1">
              <div className="text-xs font-semibold text-primary">QUIZ · {item.status}</div>
              <h2 className="font-bold text-foreground">{item.title}</h2>
              <p className="text-xs text-muted-foreground">{item.courseName} · Hạn làm: {deadline(item.dueAt)}</p>
            </div>
            <div className="text-xs text-muted-foreground">Lượt làm: {item.attemptsUsed}/{item.maxAttempts || "∞"}</div>
            <Button size="sm" disabled={item.status === "EXPIRED" || item.status === "PASSED"}
              onClick={() => navigate(`/learn/courses/${item.courseId}`)}>Mở không gian học</Button>
          </Card>
        ))}
      </div>}
    </div>
  );
};
