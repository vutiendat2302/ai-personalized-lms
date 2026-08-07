import React, { useState, useEffect } from "react";
import { studentApi, type StudentDashboardMetrics } from "@/api/student/studentApi";
import { StreakFlame } from "@/components/student/StreakFlame";
import { OnboardingModal } from "@/components/student/OnboardingModal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/useToast";
import { useAuth } from "@/hooks/useAuth";
import {
  Play,
  Sparkles,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export const StudentDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { auth } = useAuth();
  const { user } = auth;
  const { success } = useToast();

  const [metrics, setMetrics] = useState<StudentDashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    studentApi.getDashboardMetrics().then((data) => {
      setMetrics(data);
      if (!data.hasSetGoals) {
        setShowOnboarding(true);
      }
      setLoading(false);
    });
  }, []);

  const handleOnboardingComplete = async (goal: any, interests: string[]) => {
    await studentApi.submitOnboarding(goal, interests);
    success("Đã hoàn tất thiết lập mục tiêu & sở thích cá nhân hóa!");
    setShowOnboarding(false);
  };

  if (loading || !metrics) {
    return (
      <div className="p-12 text-center text-muted-foreground">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-xs font-semibold">Đang tải bảng học tập của bạn...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Onboarding Stepper Modal */}
      <OnboardingModal
        isOpen={showOnboarding}
        onComplete={handleOnboardingComplete}
        onSkipAll={() => setShowOnboarding(false)}
      />

      {/* Row 1 — Personalized Greeting & Streak Flame Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Chào {user?.fullName || "bạn"}, hôm nay là ngày thứ {metrics.currentStreak} streak của bạn 🔥
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Duy trì học tập mỗi ngày để giữ vững chuỗi Streak và chinh phục mục tiêu cá nhân!
          </p>
        </div>

        <StreakFlame currentStreak={metrics.currentStreak} longestStreak={metrics.longestStreak} size="md" />
      </div>

      {/* Row 3 — Continue Learning (Học tiếp bài đang dở) */}
      {metrics.continueLearning && (
        <Card className="bg-gradient-to-r from-primary/10 via-card to-card border-primary/30 p-6 space-y-3 shadow-md relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider bg-primary/20 text-primary rounded-full">
              Học tiếp gần nhất
            </span>
            <span className="text-xs font-bold text-primary">{metrics.continueLearning.progressPercent}% hoàn thành</span>
          </div>

          <div>
            <h2 className="text-lg font-bold text-foreground">{metrics.continueLearning.lessonTitle}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{metrics.continueLearning.courseName}</p>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="h-2 w-48 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: `${metrics.continueLearning.progressPercent}%` }} />
            </div>

            <Button
              onClick={() => navigate(`/student/courses/${metrics.continueLearning?.courseId}`)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold rounded-xl gap-2 cursor-pointer shadow-md"
            >
              <Play className="h-4 w-4 fill-primary-foreground" />
              Học tiếp ngay
            </Button>
          </div>
        </Card>
      )}

      {/* Row 4 — KPI Cards (4 Cột) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-border/40 p-4 shadow-xs">
          <span className="text-xs text-muted-foreground font-semibold">Streak hiện tại</span>
          <p className="text-2xl font-black text-foreground mt-2">{metrics.currentStreak} ngày 🔥</p>
          <p className="text-[11px] text-muted-foreground mt-1">Kỷ lục: {metrics.longestStreak} ngày</p>
        </Card>

        <Card className="bg-card border-border/40 p-4 shadow-xs">
          <span className="text-xs text-muted-foreground font-semibold">Khóa học của tôi</span>
          <p className="text-2xl font-black text-foreground mt-2">{metrics.activeCoursesCount} đang học</p>
          <p className="text-[11px] text-primary font-bold mt-1">Đã xong {metrics.completedCoursesCount} khóa</p>
        </Card>

        <Card className="bg-card border-border/40 p-4 shadow-xs">
          <span className="text-xs text-muted-foreground font-semibold">Bài tập / Quiz sắp tới</span>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-2">{metrics.upcomingDeadlinesCount} deadline</p>
          <p className="text-[11px] text-muted-foreground mt-1">Trong 48 giờ tới</p>
        </Card>

        <Card className="bg-card border-border/40 p-4 shadow-xs">
          <span className="text-xs text-muted-foreground font-semibold">Điểm TB Quiz</span>
          <p className="text-2xl font-black text-foreground mt-2">{metrics.averageQuizScore} / 10 ⭐</p>
          <p className="text-[11px] text-muted-foreground mt-1">Tổng hợp các bài test</p>
        </Card>
      </div>

      {/* Row 5 — Smart To-Do List (Cần làm hôm nay) */}
      <Card className="bg-card border-border/40 p-5 space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            Cần làm hôm nay (Smart To-Do List)
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/student/assignments")}
            className="text-xs border-border text-foreground hover:bg-muted rounded-lg gap-1.5 cursor-pointer"
          >
            Xem tất cả bài tập
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="space-y-2.5">
          {metrics.smartToDo.map((item) => (
            <div
              key={item.id}
              className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition ${
                item.isUrgent
                  ? "bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/60"
                  : "bg-background border-border/40"
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-foreground">{item.title}</span>
                  {item.isUrgent && (
                    <span className="px-2 py-0.5 text-[9px] font-extrabold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 rounded border border-rose-300 dark:border-rose-800">
                      Gấp &lt; 24h
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">{item.subtitle}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-mono font-bold text-primary">{item.dueTime}</span>
                <Button
                  size="sm"
                  onClick={() => navigate("/student/assignments")}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold rounded-lg h-8 px-3 cursor-pointer"
                >
                  Làm ngay
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Row 6 — Recommended Courses Carousel */}
      <Card className="bg-card border-border/40 p-5 space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            Gợi ý khóa học theo sở thích của bạn
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/student/catalog")}
            className="text-xs border-border text-foreground hover:bg-muted rounded-lg gap-1.5 cursor-pointer"
          >
            Khám phá thêm
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 bg-background border border-border/40 rounded-xl space-y-2">
            <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase">Lập trình Web</span>
            <h4 className="text-xs font-bold text-foreground">Khóa học Chuyên sâu Microservices với Spring Cloud</h4>
            <p className="text-[11px] text-muted-foreground">Xây dựng kiến trúc phân tán chịu tải cao.</p>
            <Button
              size="sm"
              onClick={() => navigate("/student/catalog")}
              className="bg-primary text-primary-foreground text-xs font-semibold rounded-lg h-7 px-3 mt-2 cursor-pointer"
            >
              Xem chi tiết
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
