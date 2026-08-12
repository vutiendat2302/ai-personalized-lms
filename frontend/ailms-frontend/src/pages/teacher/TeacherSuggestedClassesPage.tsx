import React, { useState, useEffect } from "react";
import { teacherApi, type SuggestedClassMatchingItem } from "@/api/teacher/teacherApi";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/useToast";
import { Sparkles, Check } from "lucide-react";

export const TeacherSuggestedClassesPage: React.FC = () => {
  const { success, error } = useToast();
  const [suggested, setSuggested] = useState<SuggestedClassMatchingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    teacherApi.getSuggestedClasses()
      .then(setSuggested)
      .catch(() => setLoadError("Không thể tải danh sách yêu cầu 1-1."))
      .finally(() => setLoading(false));
  }, []);

  /** Nhận yêu cầu qua backend có khóa chống hai người nhận đồng thời. */
  const handleAccept = async (item: SuggestedClassMatchingItem) => {
    try {
      await teacherApi.acceptSuggestedClass(item.id);
      success(`Đã nhận yêu cầu học 1-1: ${item.courseName}.`);
      setSuggested((prev) => prev.filter((i) => i.id !== item.id));
    } catch {
      error("Yêu cầu đã được người khác nhận hoặc bạn không còn đủ điều kiện nhận lớp.");
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-muted-foreground">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-xs font-semibold">Đang tìm các lớp học gợi ý phù hợp...</p>
      </div>
    );
  }

  if (loadError) {
    return <Card className="p-12 text-center text-sm text-destructive">{loadError}</Card>;
  }

  return (
    <div className="space-y-6 pb-16">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          Lớp gợi ý (Matching & Nhận lớp)
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Các yêu cầu học 1-1 đã thanh toán phù hợp với danh mục chuyên môn của bạn.
        </p>
      </div>

      {suggested.length === 0 ? (
        <Card className="bg-card border-border/40 p-12 text-center text-muted-foreground shadow-xs">
          <p className="text-sm font-semibold">Hiện chưa có lớp gợi ý mới nào.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {suggested.map((item) => (
            <Card key={item.id} className="bg-card border-border/40 p-5 space-y-4 shadow-xs">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold uppercase text-purple-600 dark:text-purple-400 tracking-wider">
                    {item.categoryName}
                  </span>
                  <h3 className="text-base font-bold text-foreground mt-0.5">{item.courseName}</h3>
                </div>
                <span className="text-[10px] text-muted-foreground">{item.includedTutorSessions} buổi chính thức</span>
              </div>

              <div className="space-y-2 text-xs text-foreground bg-muted/40 p-3.5 rounded-xl border border-border/40">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Hình thức:</span>
                  <span className="font-bold text-primary">Kèm 1-1 chuyên sâu</span>
                </div>
                <p><span className="text-muted-foreground">Trình độ:</span> {item.currentLevel}</p>
                <p><span className="text-muted-foreground">Thời gian:</span> {item.availablePeriod}; {item.availableDays}; {item.preferredTimes}</p>
                <p><span className="text-muted-foreground">Mục tiêu:</span> {item.learningGoals}</p>
                <p><span className="text-muted-foreground">Nội dung yếu:</span> {item.weakAreas}</p>
                {item.additionalNotes && <p><span className="text-muted-foreground">Ghi chú:</span> {item.additionalNotes}</p>}
              </div>

              <div className="flex items-center justify-end pt-2">
                <Button
                  size="sm"
                  onClick={() => handleAccept(item)}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold rounded-lg gap-1.5 cursor-pointer shadow-md"
                >
                  <Check className="h-4 w-4" />
                  Nhận lớp ngay
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
