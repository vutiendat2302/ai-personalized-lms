import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertCircle, ArrowLeft, Loader2 } from "lucide-react";
import { studentApi } from "@/api/student/studentApi";
import type { QuizResponseDTO } from "@/api/courses/courseAuthoringApi";
import { LearningQuizPlayer } from "@/components/student/learning/LearningQuizPlayer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/** Tải và cho học viên làm đúng Quiz lớp đã chọn từ danh sách được giao. */
export const StudentQuizAttemptPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<QuizResponseDTO | null>(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState(id ? "" : "Không tìm thấy mã Quiz.");

  /** Lấy câu hỏi đã được Backend lọc quyền và ẩn đáp án. */
  useEffect(() => {
    let ignore = false;
    if (!id) return undefined;
    studentApi.getQuiz(id)
      .then((data) => {
        if (!ignore) setQuiz(data);
      })
      .catch(() => {
        if (!ignore) {
          setError("Quiz chưa mở, đã hết hạn hoặc bạn không có quyền truy cập.");
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [id]);

  if (loading) {
    return <Card className="flex min-h-64 items-center justify-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" /> Đang tải Quiz...
    </Card>;
  }

  if (error || !quiz) {
    return <Card className="space-y-4 p-10 text-center">
      <AlertCircle className="mx-auto h-10 w-10 text-destructive" />
      <p className="text-sm text-destructive">{error || "Không có dữ liệu Quiz."}</p>
      <Button variant="outline" onClick={() => { void navigate("/student/assignments"); }}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại danh sách
      </Button>
    </Card>;
  }

  return <div className="space-y-4 pb-16">
    <Button variant="ghost" onClick={() => { void navigate("/student/assignments"); }}>
      <ArrowLeft className="mr-2 h-4 w-4" /> Bài tập và Quiz
    </Button>
    <LearningQuizPlayer
      quiz={quiz}
      persistAttempt
      onComplete={() => { void navigate("/student/assignments"); }}
    />
  </div>;
};
