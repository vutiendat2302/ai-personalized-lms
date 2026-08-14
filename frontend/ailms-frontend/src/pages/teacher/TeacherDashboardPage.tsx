import React, { useState, useEffect } from "react";
import { teacherApi, type TeacherDashboardMetrics, type AgendaSessionItem, type TeacherActivityItem } from "@/api/teacher/teacherApi";
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
  Activity,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

/**
 * Component hiển thị trang tổng quan dành cho Giảng viên & Trợ giảng (Teacher Dashboard).
 */
export const TeacherDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<TeacherDashboardMetrics | null>(null);
  const [agenda, setAgenda] = useState<AgendaSessionItem[]>([]);
  const [activities, setActivities] = useState<TeacherActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  /** Tải dữ liệu các chỉ số KPI và lịch dạy agenda của giảng viên. */
  useEffect(() => {
    Promise.all([teacherApi.getDashboardMetrics(), teacherApi.getAgenda(), teacherApi.getLatestActivities()]).then(([m, a, latest]) => {
      setMetrics(m);
      setAgenda(a);
      setActivities(latest);
      setLoading(false);
    });
  }, []);

  /** Định dạng số tiền VND hiển thị thu nhập. */
  const formatVND = (val: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);
  };

  /** Hiển thị thời gian tương đối ngắn gọn cho activity feed. */
  const relativeTime = (createdAt: string) => {
    const seconds = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000));
    if (seconds < 60) return "Vừa xong";
    if (seconds < 3600) return `${Math.floor(seconds / 60)} phút trước`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} giờ trước`;
    return `${Math.floor(seconds / 86400)} ngày trước`;
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
        <p className="text-sm text-foreground mt-1 opacity-80">
          Theo dõi thông tin các lớp đang đảm nhận, lịch dạy hôm nay và thu nhập của bạn.
        </p>
      </div>

      {/* Row 2 — KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-border/40 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground font-semibold">Lớp đang đảm nhận</span>
            <Users className="h-4 w-4 text-primary" />
          </div>
          <p className="text-2xl font-black text-foreground mt-2">{metrics.activeClassesCount}</p>
          <p className="text-sm text-foreground mt-1 opacity-80">Bao gồm nhóm và 1-1</p>
        </Card>

        <Card className="bg-card border-border/40 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground font-semibold">Buổi dạy tuần này</span>
            <Calendar className="h-4 w-4 text-primary" />
          </div>
          <p className="text-2xl font-black text-foreground mt-2">
            {metrics.sessionsThisWeekCompleted}/{metrics.sessionsThisWeekTotal}
          </p>
          <p className="text-sm text-foreground font-medium mt-1 opacity-80">Đã dạy {metrics.sessionsThisWeekCompleted} buổi</p>
        </Card>

        <Card className="bg-card border-border/40 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-sm text-foreground font-semibold">Đánh giá trung bình</span>
            <Star className="h-4 w-4" />
          </div>
          <p className="text-2xl font-black text-foreground mt-2">{metrics.averageRating} ⭐</p>
          <p className="text-sm text-foreground mt-1 opacity-80">Dựa trên review học viên</p>
        </Card>

        <Card className="bg-card border-border/40 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground font-semibold">Thu nhập tạm tính</span>
            <DollarSign className="h-4 w-4 text-primary" />
          </div>
          <p className="text-2xl font-black text-muted-foreground mt-2">{formatVND(metrics.estimatedEarningsMonth)}</p>
          <p className="text-sm text-foreground mt-1 opacity-80">Tháng này</p>
        </Card>
      </div>

      {/* Row 3 — Agenda */}
      <Card className="bg-card border-border/40 p-5 space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Lịch dạy hôm nay & sắp tới
            </h3>
            <p className="text-sm text-foreground opacity-80">Bấm vào buổi dạy để xem chi tiết hoặc mở phòng học trực tuyến</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/teacher/schedule")}
            className="text-xs font-semibold border-border text-foreground hover:bg-foreground hover:text-white rounded-lg gap-1.5 cursor-pointer"
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
        <h3 className="text-lg font-bold text-foreground flex items-center gap-2"><Activity className="h-4 w-4 text-primary" />Hoạt động mới nhất</h3>
        {activities.length === 0 ? (
          <p className="py-5 text-center text-sm opacity-80 text-muted-foreground">Chưa có hoạt động mới trong các lớp đang phụ trách.</p>
        ) : (
          <div className="space-y-2 text-xs text-muted-foreground">
            {activities.map((item) => (
              <button
                key={item.id}
                onClick={() => item.targetUrl && navigate(item.targetUrl)}
                className="flex w-full items-start justify-between gap-4 rounded-lg border border-border/40 bg-background p-2.5 text-left transition hover:border-primary/30 hover:bg-muted/40"
              >
                <span><strong className="text-foreground">{item.title}</strong><span className="mt-0.5 block">{item.content}</span></span>
                <span className="shrink-0 text-[10px]">{relativeTime(item.createdAt)}</span>
              </button>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
