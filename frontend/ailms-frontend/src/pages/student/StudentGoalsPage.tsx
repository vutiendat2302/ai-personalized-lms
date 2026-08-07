import React, { useState, useEffect } from "react";
import { studentApi, type StudyGoalItem } from "@/api/student/studentApi";
import { StreakFlame } from "@/components/student/StreakFlame";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/useToast";
import { Target, Plus, Check, Sparkles } from "lucide-react";

export const StudentGoalsPage: React.FC = () => {
  const { success } = useToast();
  const [goals, setGoals] = useState<StudyGoalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [goalType, setGoalType] = useState<any>("DAILY_STREAK");
  const [targetValue, setTargetValue] = useState(30);
  const [title, setTitle] = useState("");

  const [interests, setInterests] = useState<string[]>([
    "Lập trình Web",
    "Trí tuệ nhân tạo",
    "Data Science",
  ]);

  const allInterests = [
    "Lập trình Web",
    "Trí tuệ nhân tạo",
    "Mobile App",
    "Data Science",
    "Cloud & DevOps",
    "UI/UX Design",
    "Cyber Security",
  ];

  useEffect(() => {
    studentApi.getGoals().then((res) => {
      setGoals(res);
      setLoading(false);
    });
  }, []);

  const toggleInterest = (name: string) => {
    if (interests.includes(name)) {
      setInterests(interests.filter((i) => i !== name));
    } else {
      setInterests([...interests, name]);
    }
    success(`Đã cập nhật sở thích: ${name}`);
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    const created = await studentApi.createGoal({
      goalType,
      targetValue,
      title: title || `Mục tiêu ${goalType}`,
    });
    setGoals((prev) => [...prev, created]);
    success("Đã thiết lập mục tiêu mới thành công!");
    setShowCreateModal(false);
    setTitle("");
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-muted-foreground">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-xs font-semibold">Đang tải mục tiêu & streak cá nhân...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Target className="h-6 w-6 text-primary" />
            Mục tiêu học tập & Streak
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Tự thiết lập mục tiêu động lực và chọn các chủ đề sở thích cá nhân hóa.
          </p>
        </div>

        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold rounded-lg gap-1.5 cursor-pointer shadow-md"
        >
          <Plus className="h-4 w-4" />
          Đặt mục tiêu mới
        </Button>
      </div>

      {/* Top Streak Flame Header */}
      <StreakFlame currentStreak={5} longestStreak={12} size="lg" />

      {/* Section 1: Active Goals List */}
      <Card className="bg-card border-border/40 p-5 space-y-4 shadow-xs">
        <h3 className="text-sm font-bold text-foreground">Danh sách mục tiêu đang thực hiện</h3>
        <div className="space-y-3">
          {goals.map((g) => {
            const percent = Math.min(100, Math.round((g.currentValue / g.targetValue) * 100));
            return (
              <div key={g.id} className="p-4 bg-background border border-border/40 rounded-xl space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-primary tracking-wider">{g.goalType}</span>
                    <h4 className="font-bold text-foreground">{g.title}</h4>
                  </div>
                  <span className="text-xs font-mono font-bold text-primary">
                    {g.currentValue} / {g.targetValue} {g.unit} ({percent}%)
                  </span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${percent}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Section 2: Student Interests Selector */}
      <Card className="bg-card border-border/40 p-5 space-y-3 shadow-xs">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          Sở thích của tôi (Student Interest Chips)
        </h3>
        <p className="text-xs text-muted-foreground">Bấm chọn các lĩnh vực bạn muốn hệ thống ưu tiên gợi ý khóa học.</p>
        <div className="flex flex-wrap gap-2 pt-2">
          {allInterests.map((item) => {
            const isSelected = interests.includes(item);
            return (
              <button
                key={item}
                onClick={() => toggleInterest(item)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                    : "bg-background border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {isSelected && <Check className="h-3.5 w-3.5" />}
                {item}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Create Goal Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-popover border border-border rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-foreground">Đặt mục tiêu học tập mới</h3>
            <form onSubmit={handleCreateGoal} className="space-y-4 text-xs">
              <div>
                <label className="text-foreground font-semibold block mb-1">Loại mục tiêu:</label>
                <select
                  value={goalType}
                  onChange={(e) => setGoalType(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl p-2.5 text-foreground"
                >
                  <option value="DAILY_STREAK">Duy trì Streak (Ngày)</option>
                  <option value="WEEKLY_STUDY_DAYS">Số ngày học trong tuần (Ngày/tuần)</option>
                  <option value="COURSE_COMPLETION">Hoàn thành Khóa học (%)</option>
                  <option value="STUDY_HOURS">Tổng số giờ học trong tháng (Giờ)</option>
                </select>
              </div>

              <div>
                <label className="text-foreground font-semibold block mb-1">Tiêu đề mục tiêu:</label>
                <input
                  type="text"
                  placeholder="VD: Học 30 phút mỗi ngày"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl p-2.5 text-foreground"
                />
              </div>

              <div>
                <label className="text-foreground font-semibold block mb-1">Chỉ số mục tiêu (Target Value):</label>
                <input
                  type="number"
                  value={targetValue}
                  onChange={(e) => setTargetValue(Number(e.target.value))}
                  className="w-full bg-background border border-border rounded-xl p-2.5 text-foreground font-bold"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border/40">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                  className="text-xs border-border text-foreground cursor-pointer"
                >
                  Hủy
                </Button>
                <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold cursor-pointer">
                  Tạo mục tiêu
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
