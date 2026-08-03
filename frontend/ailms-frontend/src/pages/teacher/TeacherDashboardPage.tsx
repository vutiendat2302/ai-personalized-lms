import React, { useState, useEffect } from "react";
import { teacherApi, type TeacherDashboardMetrics, type AgendaSessionItem } from "@/api/teacher/teacherApi";
import { CountdownRing } from "@/components/teacher/CountdownRing";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/useToast";
import {
  GraduationCap,
  Users,
  Calendar,
  Sparkles,
  ClipboardList,
  AlertTriangle,
  Star,
  DollarSign,
  ArrowRight,
  Video,
  Clock,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export const TeacherDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<TeacherDashboardMetrics | null>(null);
  const [agenda, setAgenda] = useState<AgendaSessionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([teacherApi.getDashboardMetrics(), teacherApi.getAgenda()]).then(([m, a]) => {
      setMetrics(m);
      setAgenda(a);
      setLoading(false);
    });
  }, []);

  const formatVND = (val: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);
  };

  if (loading || !metrics) {
    return (
      <div className="p-12 text-center text-muted-foreground">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-xs font-semibold">Đang tải tổng quan giảng dạy...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Header Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <GraduationCap className="h-6 w-6 text-primary" />
          Tổng quan Giảng dạy
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Theo dõi hạn chót nhận xét 24h, công việc cần xử lý và thu nhập hôm nay.
        </p>
      </div>

      {/* Row 1 — Smart Action Bar */}
      <div className="space-y-3">
        <h2 className="text-xs font-extrabold tracking-wider text-amber-600 dark:text-amber-400 uppercase flex items-center gap-1.5">
          <AlertTriangle className="h-4 w-4" />
          Cảnh báo & Công việc cần xử lý ngay (Smart Action Bar)
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Action Card 1 */}
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 flex items-center justify-between gap-3 shadow-xs">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">Cảnh báo quan trọng</span>
              <h3 className="text-xs font-extrabold text-foreground">
                {metrics.unreviewedSessionsCount} buổi học chưa nhận xét
              </h3>
              <p className="text-[11px] text-muted-foreground">Hoàn thành để được tính lương 24h</p>
            </div>
            <CountdownRing initialSeconds={metrics.unreviewedMinSecondsLeft} />
          </div>

          {/* Action Card 2 */}
          <div
            onClick={() => navigate("/teacher/grading/assignments")}
            className="p-4 rounded-xl bg-card border border-border/40 hover:border-primary/60 transition cursor-pointer flex items-center justify-between gap-3 shadow-xs"
          >
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Bài chờ chấm</span>
              <h3 className="text-xs font-extrabold text-foreground">
                {metrics.pendingGradingAssignmentsCount} bài tập + {metrics.pendingFillBlankQuizzesCount} câu điền từ
              </h3>
              <p className="text-[11px] text-muted-foreground">Bấm để chấm bài nhanh</p>
            </div>
            <div className="p-2.5 bg-primary/10 text-primary rounded-xl border border-primary/20 shrink-0">
              <ClipboardList className="h-5 w-5" />
            </div>
          </div>

          {/* Action Card 3 */}
          <div
            onClick={() => navigate("/teacher/suggested-classes")}
            className="p-4 rounded-xl bg-card border border-border/40 hover:border-purple-600/60 transition cursor-pointer flex items-center justify-between gap-3 shadow-xs"
          >
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">Lớp gợi ý mới</span>
              <h3 className="text-xs font-extrabold text-foreground">
                {metrics.newSuggestedClassesCount} lớp cần Mentor/Teacher
              </h3>
              <p className="text-[11px] text-muted-foreground">Phù hợp chuyên môn của bạn</p>
            </div>
            <div className="p-2.5 bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 rounded-xl border border-purple-200 dark:border-purple-800 shrink-0">
              <Sparkles className="h-5 w-5" />
            </div>
          </div>

          {/* Action Card 4 */}
          <div
            onClick={() => navigate("/teacher/insights")}
            className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 hover:border-rose-500 transition cursor-pointer flex items-center justify-between gap-3 shadow-xs"
          >
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">Học viên nguy cơ</span>
              <h3 className="text-xs font-extrabold text-foreground">
                {metrics.atRiskStudentsCount} học viên có nguy cơ bỏ học
              </h3>
              <p className="text-[11px] text-muted-foreground">Cần gửi nhắc nhở học tập</p>
            </div>
            <div className="p-2.5 bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-300 rounded-xl border border-rose-200 dark:border-rose-700 shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Row 2 — KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-border/40 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-semibold">Lớp đang đảm nhận</span>
            <Users className="h-4 w-4 text-primary" />
          </div>
          <p className="text-2xl font-black text-foreground mt-2">{metrics.activeClassesCount}</p>
          <p className="text-[11px] text-muted-foreground mt-1">Bao gồm Lớp Nhóm & 1-1</p>
        </Card>

        <Card className="bg-card border-border/40 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-semibold">Buổi dạy tuần này</span>
            <Calendar className="h-4 w-4 text-primary" />
          </div>
          <p className="text-2xl font-black text-foreground mt-2">
            {metrics.sessionsThisWeekCompleted}/{metrics.sessionsThisWeekTotal}
          </p>
          <p className="text-[11px] text-primary font-bold mt-1">Đã dạy {metrics.sessionsThisWeekCompleted} buổi</p>
        </Card>

        <Card className="bg-card border-border/40 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-semibold">Đánh giá trung bình</span>
            <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
          </div>
          <p className="text-2xl font-black text-foreground mt-2">{metrics.averageRating} ⭐</p>
          <p className="text-[11px] text-muted-foreground mt-1">Dựa trên review học viên</p>
        </Card>

        <Card className="bg-card border-border/40 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-semibold">Thu nhập tạm tính</span>
            <DollarSign className="h-4 w-4 text-primary" />
          </div>
          <p className="text-xl font-black text-primary mt-2">{formatVND(metrics.estimatedEarningsMonth)}</p>
          <p className="text-[11px] text-muted-foreground mt-1">CONFIRMED tháng này</p>
        </Card>
      </div>

      {/* Row 3 — Agenda */}
      <Card className="bg-card border-border/40 p-5 space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Lịch dạy hôm nay & sắp tới
            </h3>
            <p className="text-xs text-muted-foreground">Bấm vào buổi dạy để xem chi tiết hoặc mở phòng học trực tuyến</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/teacher/schedule")}
            className="text-xs border-border text-foreground hover:bg-muted rounded-lg gap-1.5 cursor-pointer"
          >
            Mở xem toàn bộ Lịch
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="space-y-2.5">
          {agenda.map((item) => (
            <div
              key={item.id}
              className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition ${
                item.status === "UNREVIEWED"
                  ? "bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800"
                  : "bg-background border-border/40 hover:border-border"
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-foreground">{item.className}</span>
                  <span className="px-2 py-0.5 text-[9px] font-extrabold bg-muted text-muted-foreground rounded">
                    {item.sessionTime}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">{item.courseName} — {item.studentCount} học viên</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {item.status === "UNREVIEWED" ? (
                  <Button
                    size="sm"
                    onClick={() => navigate("/teacher/schedule")}
                    className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg h-8 px-3 gap-1.5 cursor-pointer"
                  >
                    <Clock className="h-3.5 w-3.5" />
                    Nhận xét ngay (24h)
                  </Button>
                ) : (
                  <a
                    href={item.roomUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold rounded-lg transition"
                  >
                    <Video className="h-3.5 w-3.5" />
                    Vào phòng học
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Row 4 — Activity Feed */}
      <Card className="bg-card border-border/40 p-5 space-y-3 shadow-xs">
        <h3 className="text-sm font-bold text-foreground">Hoạt động mới nhất</h3>
        <div className="space-y-2 text-xs text-muted-foreground">
          <div className="flex items-center justify-between p-2.5 bg-background rounded-lg border border-border/40">
            <span>Học viên <strong className="text-foreground">Trần Bảo Nam</strong> vừa nộp bài tập JWT Spring Security (trễ 4 giờ)</span>
            <span className="text-[10px]">10 phút trước</span>
          </div>
          <div className="flex items-center justify-between p-2.5 bg-background rounded-lg border border-border/40">
            <span>Buổi dạy <strong className="text-foreground">Lớp React-Advanced-K9</strong> hoàn thành lúc 21:00 (chờ nhận xét 24h)</span>
            <span className="text-[10px]">1 giờ trước</span>
          </div>
        </div>
      </Card>
    </div>
  );
};
