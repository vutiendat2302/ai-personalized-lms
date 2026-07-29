import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  FileSpreadsheet,
  BookOpen,
  HelpCircle,
  Award,
  Users,
  CheckCircle2,
  Filter,
} from "lucide-react";

export const LearningAnalytics: React.FC = () => {
  const [scope, setScope] = useState<"SYSTEM" | "CATEGORY" | "COURSE">("SYSTEM");

  const DROP_OFF_DATA = [
    { lesson: "Bài 1: Tổng quan", students: 100, dropRate: 2 },
    { lesson: "Bài 2: Cài đặt MT", students: 95, dropRate: 5 },
    { lesson: "Bài 3: Cú pháp cơ bản", students: 88, dropRate: 7 },
    { lesson: "Bài 4: Con trỏ & Vùng nhớ", students: 62, dropRate: 30 }, // High drop off point
    { lesson: "Bài 5: Cấu trúc Đồ thị", students: 58, dropRate: 6 },
    { lesson: "Bài 6: Thuật toán DFS/BFS", students: 55, dropRate: 5 },
  ];

  const QUESTION_DIFFICULTY_DATA = [
    { question: "Câu 1: Khái niệm con trỏ C++", errorRate: 15, isHigh: false },
    { question: "Câu 2: Phân bổ bộ nhớ Heap/Stack", errorRate: 42, isHigh: false },
    { question: "Câu 3: Thuật toán Dijkstra nâng cao", errorRate: 78, isHigh: true }, // High error rate > 70%
    { question: "Câu 4: Quản lý bộ nhớ RAM trong C++", errorRate: 35, isHigh: false },
    { question: "Câu 5: Độ phức tạp O(V+E)", errorRate: 22, isHigh: false },
  ];

  const [actionMessage, setActionMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  const showBanner = (text: string, isError = false) => {
    setActionMessage({ text, isError });
    setTimeout(() => setActionMessage(null), 4000);
  };

  const handleExportReport = () => {
    showBanner("Hệ thống đã xuất báo cáo tổng quan Analytics dạng tệp Excel thành công!");
  };

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 space-y-8 animate-in fade-in duration-300">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            <span>Phân Tích Tiến Độ & Báo Cáo Học Tập (Analytics)</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Báo cáo tổng quan hệ thống, phân tích điểm rơi (Drop-off) bài giảng và độ khó câu hỏi Quiz.
          </p>
        </div>
        <Button onClick={handleExportReport} className="rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
          <FileSpreadsheet className="h-4 w-4" /> Xuất Báo Cáo Excel
        </Button>
      </div>

      {/* Scope Selector */}
      <div className="flex items-center gap-3 bg-card p-3 rounded-2xl border border-border shadow-sm">
        <Filter className="h-4 w-4 text-primary shrink-0" />
        <span className="text-xs font-bold text-foreground">Phạm vi báo cáo:</span>
        <select
          value={scope}
          onChange={(e) => setScope(e.target.value as any)}
          className="h-9 px-3 bg-muted/40 border border-border rounded-xl text-xs font-medium text-foreground outline-none focus:border-primary"
        >
          <option value="SYSTEM">Toàn bộ Hệ thống</option>
          <option value="CATEGORY">Theo Danh mục Lập trình Web</option>
          <option value="COURSE">Khóa Cấu trúc dữ liệu C++</option>
        </select>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="border border-border/80 rounded-2xl bg-card p-5 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-xs text-muted-foreground">
            <span>Tỷ lệ hoàn thành trung bình</span>
            <Award className="h-4 w-4 text-primary" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-foreground">78.5%</span>
            <span className="text-xs font-bold text-emerald-600 flex items-center gap-0.5">
              <TrendingUp className="h-3.5 w-3.5" /> +4.2%
            </span>
          </div>
        </Card>

        <Card className="border border-border/80 rounded-2xl bg-card p-5 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-xs text-muted-foreground">
            <span>Điểm Quiz trung bình</span>
            <CheckCircle2 className="h-4 w-4 text-amber-500" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-foreground">8.4 / 10</span>
            <span className="text-xs font-bold text-emerald-600 flex items-center gap-0.5">
              <TrendingUp className="h-3.5 w-3.5" /> +0.5
            </span>
          </div>
        </Card>

        <Card className="border border-border/80 rounded-2xl bg-card p-5 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-xs text-muted-foreground">
            <span>Học viên có nguy cơ (At-risk)</span>
            <AlertTriangle className="h-4 w-4 text-rose-500" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-rose-600">12 học viên</span>
            <span className="text-xs font-bold text-rose-600 flex items-center gap-0.5">
              <TrendingDown className="h-3.5 w-3.5" /> Cần hỗ trợ
            </span>
          </div>
        </Card>

        <Card className="border border-border/80 rounded-2xl bg-card p-5 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-xs text-muted-foreground">
            <span>Tổng giờ học tập đã ghi nhận</span>
            <Users className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-foreground">1,840 Giờ</span>
            <span className="text-xs font-bold text-emerald-600 flex items-center gap-0.5">
              <TrendingUp className="h-3.5 w-3.5" /> +12%
            </span>
          </div>
        </Card>
      </div>

      {/* DROP-OFF FUNNEL CHART */}
      <Card className="border border-border/80 rounded-2xl bg-card p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              <span>Phân Tích Điểm Rơi Học Viên (Drop-off Point Funnel)</span>
            </h3>
            <p className="text-xs text-muted-foreground">
              Phân tích tỷ lệ học viên học tiếp từng bài để phát hiện bài giảng có nội dung khó hoặc gây bỏ dở bất thường.
            </p>
          </div>
        </div>

        <div className="h-72 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={DROP_OFF_DATA}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="lesson" tick={{ fontSize: 11 }} />
              <YAxis />
              <ChartTooltip />
              <Bar dataKey="students" fill="#3B82F6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 font-medium">
          ⚠️ <strong className="font-bold">Phát hiện điểm rơi bất thường:</strong> Tại <span className="font-bold underline">Bài 4: Con trỏ & Vùng nhớ</span>, tỷ lệ bỏ ngang lên tới <span className="font-bold text-rose-600">30%</span>. Giảng viên nên bổ trợ thêm ví dụ minh họa trực quan.
        </div>
      </Card>

      {/* QUESTION DIFFICULTY WIDGET FOR TEACHERS */}
      <Card className="border border-border/80 rounded-2xl bg-card p-6 shadow-sm space-y-4">
        <div>
          <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-indigo-500" />
            <span>Phân Tích Độ Khó Câu Hỏi Quiz (Question Difficulty Widget)</span>
          </h3>
          <p className="text-xs text-muted-foreground">
            Tỷ lệ học viên trả lời sai từng câu hỏi trong Quiz. Các câu hỏi có tỷ lệ sai vượt 70% sẽ được cảnh báo đỏ.
          </p>
        </div>

        <div className="space-y-3 pt-2">
          {QUESTION_DIFFICULTY_DATA.map((q, idx) => (
            <div key={idx} className="space-y-1 text-xs">
              <div className="flex justify-between items-center font-bold">
                <span className="text-foreground">{q.question}</span>
                <span className={q.isHigh ? "text-rose-600 font-extrabold" : "text-muted-foreground"}>
                  {q.errorRate}% Học viên trả lời sai {q.isHigh && "⚠️ Khó bất thường"}
                </span>
              </div>
              <div className="w-full bg-muted h-2.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    q.isHigh ? "bg-rose-500" : "bg-primary"
                  }`}
                  style={{ width: `${q.errorRate}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* TOAST BANNER NOTIFICATIONS */}
      {actionMessage && (
        <div
          className={cn(
            "fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl text-white px-5 py-3.5 shadow-2xl animate-in slide-in-from-bottom-5 duration-300",
            actionMessage.isError ? "bg-destructive" : "bg-emerald-600"
          )}
        >
          <span className="text-sm font-semibold">{actionMessage.text}</span>
        </div>
      )}

    </div>
  );
};
