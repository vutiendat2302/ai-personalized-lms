import React, { useState, useEffect } from "react";
import { teacherApi } from "@/api/teacher/teacherApi";
import { StudentRiskRow, type AtRiskStudentData } from "@/components/teacher/StudentRiskRow";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/useToast";
import { TrendingUp, AlertTriangle, Info } from "lucide-react";

export const TeacherInsightsPage: React.FC = () => {
  const { success } = useToast();
  const [atRiskStudents, setAtRiskStudents] = useState<AtRiskStudentData[]>([]);
  const [scope, setScope] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    teacherApi.getAtRiskStudents().then((res) => {
      setAtRiskStudents(res);
      setLoading(false);
    });
  }, []);

  const handleSendReminder = async (s: AtRiskStudentData) => {
    await teacherApi.sendStudentReminder(s.id);
    success(`Đã gửi thông báo & email nhắc nhở tới ${s.studentName}!`);
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-muted-foreground">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-xs font-semibold">Đang tổng hợp dữ liệu học viên nguy cơ & tiến độ...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            Tiến độ & Học viên nguy cơ (Smart Insights)
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Phân tích chuyên sâu điểm Drop-off point trong bài học, bài tập điểm thấp & danh sách học viên nguy cơ bỏ học.
          </p>
        </div>

        {/* Scope Selector */}
        <select
          value={scope}
          onChange={(e) => setScope(e.target.value)}
          className="bg-card border border-border rounded-xl px-3 py-2 text-xs text-foreground"
        >
          <option value="ALL">Tất cả lớp đang dạy</option>
          <option value="FS-2026-K1">Lớp Fullstack Web FS-2026-K1</option>
          <option value="AI-K2">Lớp AI Specialist K2</option>
        </select>
      </div>

      {/* Section 1: At Risk Students Table */}
      <Card className="bg-card border-border/40 p-5 space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
            Danh sách Học viên Nguy cơ bỏ học ({atRiskStudents.length})
          </h3>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground bg-muted/40 px-2.5 py-1 rounded-lg border border-border/40">
            <Info className="h-3.5 w-3.5 text-primary" />
            Tiêu chí: Không truy cập &gt; 7 ngày & Tiến độ &lt; 40% so với kỳ vọng
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-border/40">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/40 bg-muted/40 text-[11px] text-muted-foreground uppercase font-bold">
                <th className="p-3">Học viên</th>
                <th className="p-3">Lớp / Khóa học</th>
                <th className="p-3">Cảnh báo / Tình trạng</th>
                <th className="p-3">Tiến độ khóa</th>
                <th className="p-3">Điểm Quiz TB</th>
                <th className="p-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {atRiskStudents.map((s) => (
                <StudentRiskRow key={s.id} student={s} onSendReminder={handleSendReminder} />
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Section 2: Lesson Drop-off Point Funnel Chart */}
      <Card className="bg-card border-border/40 p-5 space-y-4 shadow-xs">
        <h3 className="text-sm font-bold text-foreground">Biểu đồ tỷ lệ bỏ học theo bài học (Drop-off Point Funnel)</h3>
        <div className="space-y-3 text-xs">
          <div className="space-y-1">
            <div className="flex justify-between text-foreground font-semibold">
              <span>Bài 1: Tổng quan Spring Boot 3</span>
              <span className="text-primary font-bold">98% hoàn thành</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: "98%" }} />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-foreground font-semibold">
              <span>Bài 5: Cấu hình SecurityContextHolder & JWT Filter</span>
              <span className="text-rose-600 dark:text-rose-400 font-bold">52% hoàn thành (Drop-off cao nhất ⚠️)</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-rose-500 rounded-full" style={{ width: "52%" }} />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
