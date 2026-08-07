import React, { useState, useEffect } from "react";
import { teacherApi, type SuggestedClassMatchingItem } from "@/api/teacher/teacherApi";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/useToast";
import { Sparkles, Check, X } from "lucide-react";

export const TeacherSuggestedClassesPage: React.FC = () => {
  const { success } = useToast();
  const [suggested, setSuggested] = useState<SuggestedClassMatchingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    teacherApi.getSuggestedClasses().then((res) => {
      setSuggested(res);
      setLoading(false);
    });
  }, []);

  const handleAccept = async (item: SuggestedClassMatchingItem) => {
    await teacherApi.acceptSuggestedClass(item.id);
    success(`Đã đăng ký nhận lớp thành công: ${item.courseName}!`);
    setSuggested((prev) => prev.filter((i) => i.id !== item.id));
  };

  const handleIgnore = (id: string) => {
    setSuggested((prev) => prev.filter((i) => i.id !== id));
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-muted-foreground">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-xs font-semibold">Đang tìm các lớp học gợi ý phù hợp...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          Lớp gợi ý (Matching & Nhận lớp)
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Hệ thống tự động đề xuất các lớp nhóm & học viên 1-1 mới phù hợp với chuyên môn & lịch rảnh của bạn.
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
                {item.isExpiringSoon && (
                  <span className="px-2 py-0.5 text-[9px] font-extrabold bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 rounded border border-amber-300 dark:border-amber-800 animate-pulse">
                    Sắp hết hạn gợi ý
                  </span>
                )}
              </div>

              <div className="space-y-2 text-xs text-foreground bg-muted/40 p-3.5 rounded-xl border border-border/40">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Hình thức:</span>
                  <span className="font-bold text-primary">
                    {item.classType === "ONE_ON_ONE" ? "Kèm 1-1 Chuyên Sâu" : "Lớp Nhóm Online"}
                  </span>
                </div>

                {item.requestedSchedule && (
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/40 text-amber-600 dark:text-amber-400">
                    <span className="text-muted-foreground shrink-0">Lịch học viên yêu cầu:</span>
                    <span className="font-bold text-right">{item.requestedSchedule}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleIgnore(item.id)}
                  className="text-xs border-border text-muted-foreground hover:bg-muted cursor-pointer gap-1.5"
                >
                  <X className="h-3.5 w-3.5" />
                  Bỏ qua
                </Button>
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
