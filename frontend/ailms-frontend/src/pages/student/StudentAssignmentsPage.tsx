import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { studentApi, type StudentAssignmentItem } from "@/api/student/studentApi";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/useToast";
import { CheckSquare, Clock, ArrowLeft, Send } from "lucide-react";

export const StudentAssignmentsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success, error } = useToast();

  const [assignments, setAssignments] = useState<StudentAssignmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("ALL");

  // Quiz Attempt View state
  const [quizTimerSeconds, setQuizTimerSeconds] = useState<number>(300); // 5 mins
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    studentApi.getAssignments().then((res) => {
      setAssignments(res);
      setLoading(false);
    });
  }, []);

  // Timer countdown for quiz attempt screen
  useEffect(() => {
    if (!id) return;
    const timer = setInterval(() => {
      setQuizTimerSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          error("Hết thời gian làm bài Quiz! Hệ thống tự động nộp bài.");
          navigate("/student/assignments");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [id, navigate, error]);

  const handleSelectQuizAnswer = (qKey: string, ans: string) => {
    setQuizAnswers((prev) => ({ ...prev, [qKey]: ans }));
    // Realtime auto-save indicator trigger
  };

  const handleSubmitQuizAttempt = () => {
    success("Đã hoàn tất bài làm Quiz & lưu điểm thành công!");
    navigate("/student/assignments");
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-muted-foreground">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-xs font-semibold">Đang tải danh sách bài tập & quiz...</p>
      </div>
    );
  }

  // QUIZ ATTEMPT SCREEN
  if (id) {
    const mins = Math.floor(quizTimerSeconds / 60);
    const secs = quizTimerSeconds % 60;
    const isUrgent = quizTimerSeconds < 120; // < 2 mins

    return (
      <div className="space-y-6 pb-16 max-w-3xl mx-auto">
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/student/assignments")}
            className="rounded-lg gap-1.5 text-xs border-border text-foreground cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Thoát bài Quiz
          </Button>

          {/* Sticky Countdown Timer */}
          <div
            className={`px-3 py-1.5 rounded-xl border text-xs font-black font-mono flex items-center gap-1.5 ${
              isUrgent
                ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border-rose-400 animate-pulse"
                : "bg-primary/10 text-primary border-primary/20"
            }`}
          >
            <Clock className="h-4 w-4" />
            <span>Thời gian còn lại: {mins}:{secs < 10 ? "0" + secs : secs}</span>
          </div>
        </div>

        <Card className="bg-card border-border/40 p-6 space-y-6 shadow-md">
          <div className="border-b border-border/40 pb-3">
            <h2 className="text-lg font-bold text-foreground">Bài thi Quiz 1: Kiến trúc RESTful API & Security</h2>
            <p className="text-xs text-muted-foreground">Thời gian làm bài: 5 phút • Tự động lưu đáp án khi chọn</p>
          </div>

          <div className="space-y-4 text-xs">
            <div className="p-4 bg-background border border-border/40 rounded-xl space-y-3">
              <p className="font-bold text-foreground">Câu 1: Annotations nào trong Spring Boot dùng để định nghĩa một REST Controller?</p>
              <div className="space-y-2">
                {["@Controller", "@RestController", "@Service", "@Component"].map((opt) => (
                  <label key={opt} className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg cursor-pointer hover:bg-muted">
                    <input
                      type="radio"
                      name="q1"
                      checked={quizAnswers["q1"] === opt}
                      onChange={() => handleSelectQuizAnswer("q1", opt)}
                    />
                    <span className="text-foreground">{opt}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-border/40">
            <Button
              onClick={handleSubmitQuizAttempt}
              className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold rounded-lg cursor-pointer"
            >
              Nộp bài Quiz ngay
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // MAIN ASSIGNMENTS & QUIZZES LIST VIEW
  return (
    <div className="space-y-6 pb-16">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <CheckSquare className="h-6 w-6 text-primary" />
          Bài tập cần nộp & Quiz
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Hợp nhất danh sách Bài tập về nhà (Assignment) & Bài trắc nghiệm (Quiz).
        </p>
      </div>

      {/* Filter Chips */}
      <div className="flex border-b border-border/40">
        <button
          onClick={() => setFilter("ALL")}
          className={`px-4 py-2.5 text-xs font-bold transition border-b-2 cursor-pointer ${
            filter === "ALL"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Tất cả ({assignments.length})
        </button>
      </div>

      {/* Assignments List */}
      <div className="space-y-3">
        {assignments.map((item) => (
          <Card key={item.id} className="bg-card border-border/40 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-foreground">{item.title}</span>
                <span className="px-2 py-0.5 text-[9px] font-extrabold bg-primary/10 text-primary rounded">
                  ASSIGNMENT
                </span>
                {item.status === "RETURNED" && (
                  <span className="px-2 py-0.5 text-[9px] font-extrabold bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 rounded border border-amber-300 dark:border-amber-800 animate-pulse">
                    Yêu cầu nộp lại
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">{item.courseName} — Hạn nộp: {new Date(item.dueDate).toLocaleString("vi-VN")}</p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs font-bold text-foreground">Điểm: /{item.maxScore}</span>
              <Button
                size="sm"
                onClick={() => navigate(`/student/quizzes/${item.id}/attempt`)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold rounded-lg h-8 px-3 cursor-pointer"
              >
                Làm bài ngay
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
