import React, { useEffect, useState } from "react";
import { interestApi, type InterestResponse } from "@/api/interests/interestApi";
import { Button } from "@/components/ui/button";
import { Sparkles, Target, Check, ArrowRight, X } from "lucide-react";

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: (goal: any, interests: string[]) => void;
  onSkipAll: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onComplete,
  onSkipAll,
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [goalType, setGoalType] = useState<string>("DAILY_STREAK");
  const [targetValue, setTargetValue] = useState<number>(30);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [interests, setInterests] = useState<InterestResponse[]>([]);
  const [interestError, setInterestError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    interestApi.getInterests()
      .then((response) => setInterests(response.data.data))
      .catch(() => setInterestError("Không thể tải danh sách sở thích."));
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleInterest = (id: string) => {
    if (selectedInterests.includes(id)) {
      setSelectedInterests(selectedInterests.filter((item) => item !== id));
    } else {
      setSelectedInterests([...selectedInterests, id]);
    }
  };

  const handleFinish = () => {
    onComplete({ goalType, targetValue }, selectedInterests);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-popover border border-border rounded-2xl p-6 max-w-lg w-full space-y-5 shadow-2xl relative animate-in fade-in zoom-in-95">
        <button
          onClick={onSkipAll}
          className="absolute top-4 right-4 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer flex items-center gap-1"
        >
          <span>Bỏ qua tất cả</span>
          <X className="h-3.5 w-3.5" />
        </button>

        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] font-extrabold bg-primary/10 text-primary rounded">
              Bước {step} / 2
            </span>
            <h3 className="text-base font-bold text-foreground">Thiết lập trải nghiệm cá nhân hóa</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            {step === 1
              ? "Đặt mục tiêu học tập ban đầu để nhận thông báo nhắc nhở & theo dõi streak."
              : "Chọn các chủ đề bạn quan tâm để hệ thống gợi ý lộ trình phù hợp."}
          </p>
        </div>

        {/* STEP 1: GOALS */}
        {step === 1 && (
          <div className="space-y-4 text-xs">
            <div>
              <label className="text-foreground font-semibold block mb-1.5">Loại mục tiêu học tập:</label>
              <select
                value={goalType}
                onChange={(e) => setGoalType(e.target.value)}
                className="w-full bg-background border border-border rounded-xl p-2.5 text-foreground"
              >
                <option value="DAILY_STREAK">Duy trì Streak học tập mỗi ngày (Ngày)</option>
                <option value="WEEKLY_STUDY_DAYS">Số ngày học trong tuần (Ngày/tuần)</option>
                <option value="COURSE_COMPLETION">Hoàn thành Khóa học (% Tiến độ)</option>
                <option value="STUDY_HOURS">Tổng số giờ học trong tháng (Giờ)</option>
              </select>
            </div>

            <div>
              <label className="text-foreground font-semibold block mb-1.5">Chỉ số mục tiêu (Target Value):</label>
              <input
                type="number"
                value={targetValue}
                onChange={(e) => setTargetValue(Number(e.target.value))}
                className="w-full bg-background border border-border rounded-xl p-2.5 text-foreground font-bold"
              />
            </div>
          </div>
        )}

        {/* STEP 2: INTERESTS */}
        {step === 2 && (
          <div className="space-y-3">
            <label className="text-xs font-bold text-foreground block">Chọn các chủ đề yêu thích:</label>
            <div className="flex flex-wrap gap-2">
              {interests.map((item) => {
                const isSelected = selectedInterests.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleInterest(item.id)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary shadow-xs"
                        : "bg-background border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {isSelected && <Check className="h-3.5 w-3.5" />}
                    {item.name}
                  </button>
                );
              })}
            </div>
            {interestError && <p className="text-xs text-destructive">{interestError}</p>}
            {!interestError && interests.length === 0 && <p className="text-xs text-muted-foreground">Chưa có lĩnh vực sở thích.</p>}
          </div>
        )}

        {/* Footer Buttons */}
        <div className="flex items-center justify-between pt-3 border-t border-border/40">
          <Button
            type="button"
            variant="outline"
            onClick={onSkipAll}
            className="text-xs border-border text-muted-foreground hover:text-foreground cursor-pointer"
          >
            Bỏ qua bước này
          </Button>

          {step === 1 ? (
            <Button
              type="button"
              onClick={() => setStep(2)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold rounded-lg gap-1.5 cursor-pointer"
            >
              Tiếp theo
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleFinish}
              className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold rounded-lg gap-1.5 cursor-pointer"
            >
              <Sparkles className="h-4 w-4" />
              Hoàn tất Onboarding
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
