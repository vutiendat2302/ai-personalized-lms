import React, { useState, useEffect } from "react";
import {
  teacherApi,
  type FillBlankQuestionItem,
  type QuestionDifficultyStat,
} from "@/api/teacher/teacherApi";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/useToast";
import { FileCheck, CheckCircle, XCircle, BarChart2 } from "lucide-react";

export const TeacherGradingQuizzesPage: React.FC = () => {
  const { success } = useToast();
  const [activeTab, setActiveTab] = useState<"MANAGEMENT" | "FILL_BLANK" | "DIFFICULTY">("FILL_BLANK");
  const [fillBlankItems, setFillBlankItems] = useState<FillBlankQuestionItem[]>([]);
  const [difficultyStats, setDifficultyStats] = useState<QuestionDifficultyStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      teacherApi.getFillBlankQuizzes(),
      teacherApi.getQuestionDifficultyStats(),
    ]).then(([fb, diff]) => {
      setFillBlankItems(fb);
      setDifficultyStats(diff);
      setLoading(false);
    });
  }, []);

  const handleGradeFillBlank = async (id: string, points: number, studentName: string) => {
    await teacherApi.gradeFillBlankQuestion(id, points);
    success(`Đã cho ${points} điểm cho câu trả lời của ${studentName}!`);
    setFillBlankItems((prev) => prev.filter((i) => i.id !== id));
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-muted-foreground">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-xs font-semibold">Đang tải câu hỏi Quiz cần chấm tay...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <FileCheck className="h-6 w-6 text-primary" />
          Bài thi & Quiz (Chấm tay câu điền từ & Phân tích độ khó)
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Chấm nhanh các câu hỏi tự do / điền từ (FILL_BLANK) và phân tích độ khó các câu hỏi.
        </p>
      </div>

      {/* 3 Distinct Tabs */}
      <div className="flex border-b border-border/40">
        <button
          onClick={() => setActiveTab("FILL_BLANK")}
          className={`px-4 py-2.5 text-xs font-bold transition border-b-2 cursor-pointer ${
            activeTab === "FILL_BLANK"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Chấm tay FILL_BLANK ({fillBlankItems.length})
        </button>
        <button
          onClick={() => setActiveTab("DIFFICULTY")}
          className={`px-4 py-2.5 text-xs font-bold transition border-b-2 cursor-pointer ${
            activeTab === "DIFFICULTY"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Phân tích độ khó câu hỏi (% Sai)
        </button>
        <button
          onClick={() => setActiveTab("MANAGEMENT")}
          className={`px-4 py-2.5 text-xs font-bold transition border-b-2 cursor-pointer ${
            activeTab === "MANAGEMENT"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Quản lý Quiz
        </button>
      </div>

      {/* TAB 1: FILL_BLANK MANUAL GRADING QUEUE */}
      {activeTab === "FILL_BLANK" && (
        <div className="space-y-4">
          {fillBlankItems.length === 0 ? (
            <Card className="bg-card border-border/40 p-12 text-center text-muted-foreground shadow-xs">
              <p className="text-sm font-bold text-foreground">Đã hoàn thành chấm toàn bộ các câu FILL_BLANK!</p>
            </Card>
          ) : (
            fillBlankItems.map((item) => (
              <Card key={item.id} className="bg-card border-border/40 p-4 space-y-3 shadow-xs">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-foreground">{item.quizTitle}</span>
                  <span className="text-muted-foreground">Học viên: <strong className="text-primary">{item.studentName}</strong></span>
                </div>

                <div className="p-3 bg-muted/40 rounded-xl border border-border/40 space-y-1.5 text-xs">
                  <p className="text-foreground font-semibold">{item.questionText}</p>
                  <div className="flex items-center gap-4 text-xs font-mono pt-1">
                    <span className="text-amber-600 dark:text-amber-400">Học viên điền: <strong>"{item.studentAnswer}"</strong></span>
                    <span className="text-muted-foreground">Đáp án gốc: "{item.correctAnswer}"</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/40">
                  <span className="text-xs text-muted-foreground">Điểm tối đa: {item.maxPoints} điểm</span>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleGradeFillBlank(item.id, item.maxPoints, item.studentName)}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold rounded-lg cursor-pointer gap-1"
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                      Đúng nhanh ({item.maxPoints} điểm)
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleGradeFillBlank(item.id, 0, item.studentName)}
                      className="bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800 text-xs font-bold rounded-lg cursor-pointer gap-1 hover:bg-rose-200"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Sai nhanh (0 điểm)
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* TAB 2: QUESTION DIFFICULTY ANALYTICS */}
      {activeTab === "DIFFICULTY" && (
        <Card className="bg-card border-border/40 p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-rose-600 dark:text-rose-400" />
              Thống kê câu hỏi học viên hay trả lời sai nhất (% Error Rate)
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border/40 bg-muted/40 text-muted-foreground font-bold uppercase text-[11px]">
                  <th className="p-3">Bài Quiz</th>
                  <th className="p-3">Nội dung Câu hỏi</th>
                  <th className="p-3">Số lượt làm</th>
                  <th className="p-3">Số lần sai</th>
                  <th className="p-3">Tỉ lệ sai (%)</th>
                </tr>
              </thead>
              <tbody>
                {difficultyStats.map((stat) => (
                  <tr key={stat.id} className="border-b border-border/40 hover:bg-muted/40">
                    <td className="p-3 font-semibold text-foreground">{stat.quizTitle}</td>
                    <td className="p-3 text-foreground">{stat.questionText}</td>
                    <td className="p-3 font-mono text-muted-foreground">{stat.totalAttempts}</td>
                    <td className="p-3 font-mono text-rose-600 dark:text-rose-400 font-bold">{stat.errorCount}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 font-bold font-mono text-xs bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 rounded border border-rose-300 dark:border-rose-800">
                        {stat.errorRatePercent}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 3: QUIZ MANAGEMENT */}
      {activeTab === "MANAGEMENT" && (
        <Card className="bg-card border-border/40 p-5 text-xs text-muted-foreground space-y-2 shadow-xs">
          <h3 className="font-bold text-foreground">Danh sách các đề Quiz đã tạo</h3>
          <p className="text-muted-foreground">Tạo mới & quản lý câu hỏi trắc nghiệm trực tiếp trong trang Quản lý Khóa học.</p>
        </Card>
      )}
    </div>
  );
};
