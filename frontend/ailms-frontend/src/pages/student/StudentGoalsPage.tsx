import React, { useState, useEffect } from "react";
import { studentApi, type StudentPersonalization } from "@/api/student/studentApi";
import { StudentOnboardingModal } from "@/components/student/StudentOnboardingModal";
import { StreakFlame } from "@/components/student/StreakFlame";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/useToast";
import {
  Target,
  Sparkles,
  Edit3,
  Heart,
  GraduationCap,
  Compass,
  CheckCircle2,
  Building2,
  Flame,
  Award,
  HelpCircle,
} from "lucide-react";

export const StudentGoalsPage: React.FC = () => {
  const { success, error } = useToast();
  const [personalization, setPersonalization] = useState<StudentPersonalization | null>(null);
  const [loading, setLoading] = useState(true);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);

  const fetchPersonalization = async () => {
    try {
      setLoading(true);
      const data = await studentApi.getPersonalization();
      setPersonalization(data);
    } catch (err) {
      console.error("Lỗi khi tải thông tin cá nhân hóa:", err);
      error("Không thể tải hồ sơ cá nhân hóa của bạn.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPersonalization();
  }, []);

  const handleOnboardingSuccess = () => {
    success("Đã lưu mục tiêu và sở thích cá nhân hóa!");
    fetchPersonalization();
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-muted-foreground">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-xs font-semibold">Đang tải hồ sơ mục tiêu & sở thích cá nhân...</p>
      </div>
    );
  }

  const hasGoal = personalization?.hasGoal ?? false;
  const interestsList = personalization?.interests || personalization?.topics || [];
  const studyGoals = personalization?.studyGoals || [];

  return (
    <div className="space-y-6 pb-16">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border/50 rounded-2xl p-6 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Target className="h-6 w-6" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              Mục tiêu & Sở thích cá nhân hóa
              {hasGoal ? (
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px] font-bold">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Đã thiết lập
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px] font-bold">
                  Chưa cài đặt
                </Badge>
              )}
            </h1>
          </div>
          <p className="text-xs text-muted-foreground">
            Quản lý trình độ xuất phát, định hướng cá nhân, danh sách sở thích bài học và thói quen học tập.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            onClick={() => setShowOnboardingModal(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold rounded-xl gap-2 cursor-pointer shadow-md py-2.5 px-4"
          >
            {hasGoal ? (
              <>
                <Edit3 className="h-4 w-4" />
                Cập nhật mục tiêu & sở thích
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 text-amber-300 animate-pulse" />
                Tạo mục tiêu & sở thích
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Grid 1: Personalization Overview Card */}
      <Card className="bg-card border-border/50 p-6 space-y-4 shadow-xs rounded-2xl">
        <div className="flex items-center justify-between border-b border-border/40 pb-3">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-primary" />
            Hồ sơ Định hướng & Nền tảng cá nhân
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowOnboardingModal(true)}
            className="text-xs text-primary hover:text-primary/80 font-semibold gap-1 cursor-pointer h-7 px-2"
          >
            <Edit3 className="h-3.5 w-3.5" />
            Chỉnh sửa
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-background border border-border/40 rounded-xl space-y-1">
            <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider block">Trình độ học vấn</span>
            <p className="text-xs font-bold text-foreground truncate">
              {personalization?.educationLevel || <span className="text-muted-foreground italic font-normal">Chưa cập nhật</span>}
            </p>
          </div>

          <div className="p-4 bg-background border border-border/40 rounded-xl space-y-1">
            <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider block">Mục tiêu phát triển</span>
            <p className="text-xs font-bold text-foreground truncate">
              {personalization?.goal || <span className="text-muted-foreground italic font-normal">Chưa cập nhật</span>}
            </p>
          </div>

          <div className="p-4 bg-background border border-border/40 rounded-xl space-y-1">
            <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider block">Nền tảng xuất phát</span>
            <p className="text-xs font-bold text-foreground truncate">
              {personalization?.description || <span className="text-muted-foreground italic font-normal">Chưa cập nhật</span>}
            </p>
          </div>

          <div className="p-4 bg-background border border-border/40 rounded-xl space-y-1">
            <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider block flex items-center gap-1">
              <Building2 className="h-3 w-3 text-muted-foreground" /> Trường học / Đơn vị
            </span>
            <p className="text-xs font-bold text-foreground truncate">
              {personalization?.schoolName || <span className="text-muted-foreground italic font-normal">Chưa cập nhật</span>}
            </p>
          </div>
        </div>
      </Card>

      {/* Grid 2: Interests & Topics Card */}
      <Card className="bg-card border-border/50 p-6 space-y-4 shadow-xs rounded-2xl">
        <div className="flex items-center justify-between border-b border-border/40 pb-3">
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-rose-500" />
            <h3 className="text-sm font-bold text-foreground">Chủ đề & Sở thích học tập đã chọn</h3>
            <Badge variant="secondary" className="text-[10px] font-bold">
              {interestsList.length} sở thích
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowOnboardingModal(true)}
            className="text-xs text-primary hover:text-primary/80 font-semibold gap-1 cursor-pointer h-7 px-2"
          >
            <Compass className="h-3.5 w-3.5" />
            Thay đổi sở thích
          </Button>
        </div>

        {interestsList.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {interestsList.map((item) => (
              <div
                key={item.id}
                className="p-3.5 bg-background border border-border/40 hover:border-primary/40 rounded-xl space-y-1.5 transition-all duration-200"
              >
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-bold text-foreground truncate">{item.name}</h4>
                  {item.code && (
                    <Badge variant="outline" className="text-[9px] font-mono text-primary bg-primary/5 shrink-0">
                      {item.code}
                    </Badge>
                  )}
                </div>
                {item.description && (
                  <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center bg-background/50 border border-dashed border-border/60 rounded-xl space-y-3">
            <HelpCircle className="h-8 w-8 text-muted-foreground/60 mx-auto" />
            <div className="space-y-1">
              <p className="text-xs font-semibold text-foreground">Bạn chưa lựa chọn chủ đề sở thích nào.</p>
              <p className="text-[11px] text-muted-foreground">
                Hãy cài đặt sở thích để hệ thống gợi ý các khóa học và bài giảng phù hợp nhất với bạn.
              </p>
            </div>
            <Button
              onClick={() => setShowOnboardingModal(true)}
              className="bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold rounded-lg cursor-pointer"
            >
              Chọn sở thích ngay
            </Button>
          </div>
        )}
      </Card>

      {/* Grid 3: Active Study Goals & Streak */}
      <div className="space-y-4">
        {/* Streak Flame Header */}
        <StreakFlame
          currentStreak={Math.max(0, ...studyGoals.map((g) => g.currentStreak ?? 0))}
          longestStreak={Math.max(0, ...studyGoals.map((g) => g.longestStreak ?? 0))}
          size="lg"
        />

        <Card className="bg-card border-border/50 p-6 space-y-4 shadow-xs rounded-2xl">
          <div className="flex items-center justify-between border-b border-border/40 pb-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Award className="h-4 w-4 text-amber-500" />
              Mục tiêu học tập đang thực hiện
            </h3>
          </div>

          {studyGoals.length > 0 ? (
            <div className="space-y-3">
              {studyGoals.map((g) => {
                const target = g.targetValue || 1;
                const current = g.currentValue || 0;
                const percent = Math.min(100, Math.round((current / target) * 100));

                return (
                  <div key={g.id} className="p-4 bg-background border border-border/40 rounded-xl space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase text-primary tracking-wider bg-primary/10 px-2 py-0.5 rounded-md">
                            {g.studyGoalTypeEnum}
                          </span>
                          <span className="text-[10px] font-semibold text-muted-foreground">
                            Trạng thái: <strong className="text-foreground">{g.status}</strong>
                          </span>
                        </div>
                        <h4 className="font-bold text-foreground pt-1">Mục tiêu {g.studyGoalTypeEnum}</h4>
                      </div>

                      <span className="text-xs font-mono font-bold text-primary">
                        {current} / {target} ({percent}%)
                      </span>
                    </div>

                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${percent}%` }} />
                    </div>

                    {(g.currentStreak !== undefined && g.currentStreak !== null) && (
                      <div className="flex items-center gap-3 pt-1 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1 text-amber-600 font-medium">
                          <Flame className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                          Streak hiện tại: <strong>{g.currentStreak} ngày</strong>
                        </span>
                        {g.longestStreak && (
                          <span>
                            Streak kỷ lục: <strong>{g.longestStreak} ngày</strong>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-6 text-center text-muted-foreground text-xs">
              Chưa có mục tiêu học tập nào được khởi tạo.
            </div>
          )}
        </Card>
      </div>

      {/* Student Onboarding & Personalization Modal */}
      <StudentOnboardingModal
        isOpen={showOnboardingModal}
        onClose={() => setShowOnboardingModal(false)}
        onSuccess={handleOnboardingSuccess}
      />
    </div>
  );
};
