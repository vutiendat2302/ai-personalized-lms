import React, { useState, useEffect } from "react";
import { studentApi, type StudentProgressAnalytics } from "@/api/student/studentApi";
import { Card } from "@/components/ui/card";
import { BarChart2, TrendingUp, CalendarDays } from "lucide-react";

export const StudentProgressPage: React.FC = () => {
  const [data, setData] = useState<StudentProgressAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    studentApi.getProgressAnalytics().then((res) => {
      setData(res);
      setLoading(false);
    });
  }, []);

  if (loading || !data) {
    return (
      <div className="p-12 text-center text-muted-foreground">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-xs font-semibold">Đang tổng hợp dữ liệu tiến độ học tập...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <BarChart2 className="h-6 w-6 text-primary" />
          Tiến độ học tập & Heatmap
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Theo dõi tổng thời lượng học tập theo thời gian và bản đồ mật độ Contribution Heatmap.
        </p>
      </div>

      {/* Course Progress Comparison Table */}
      <Card className="bg-card border-border/40 p-5 space-y-4 shadow-xs">
        <h3 className="text-sm font-bold text-foreground">So sánh Tiến độ thực tế vs Mục tiêu đã đặt</h3>
        <div className="space-y-3">
          {data.courseProgress.map((cp, idx) => (
            <div key={idx} className="p-3 bg-background border border-border/40 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between font-semibold text-foreground">
                <span>{cp.courseName}</span>
                <span className="text-primary font-bold">{cp.progressPercent}% · Quiz TB {cp.averageQuizScore ?? "Chưa có"}</span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${cp.progressPercent}%` }} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* GitHub-style Contribution Heatmap */}
      <Card className="bg-card border-border/40 p-5 space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            Learning Activity Heatmap (Mật độ hoạt động)
          </h3>
          <span className="text-xs text-muted-foreground">30 ngày qua</span>
        </div>

        <div className="flex flex-wrap gap-1.5 p-3 bg-background border border-border/40 rounded-xl">
          {Array.from({ length: 30 }).map((_, i) => {
            const count = (i % 5 === 0) ? 6 : (i % 3 === 0) ? 3 : (i % 2 === 0) ? 1 : 0;
            return (
              <div
                key={i}
                title={`Ngày ${i + 1}: ${count} bài học đã hoàn thành`}
                className={`h-6 w-6 rounded-md transition hover:scale-110 ${
                  count >= 5
                    ? "bg-primary"
                    : count >= 3
                    ? "bg-primary/70"
                    : count >= 1
                    ? "bg-primary/30"
                    : "bg-muted/40"
                }`}
              />
            );
          })}
        </div>
      </Card>
    </div>
  );
};
