import React, { useEffect, useState } from "react";
import { courseApi } from "@/api/courses/courseApi";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, Loader2, CheckCircle2, AlertTriangle, Users } from "lucide-react";

export function SuggestedClassesPage() {
  const { auth } = useAuth();
  const userId = auth.user?.id;

  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | number | null>(null);

  // Toast Banner
  const [bannerMsg, setBannerMsg] = useState<{ text: string; isError?: boolean } | null>(null);

  const showBanner = (text: string, isError = false) => {
    setBannerMsg({ text, isError });
    setTimeout(() => setBannerMsg(null), 4000);
  };

  const fetchSuggestedClasses = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await courseApi.getSuggestedClasses(userId);
      setClasses(res.data?.data || []);
    } catch (err: any) {
      showBanner("Lỗi khi tải danh sách lớp gợi ý", true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuggestedClasses();
  }, [userId]);

  const handleClaimClass = async (cls: any) => {
    if (!userId) return;
    setClaimingId(cls.id);
    try {
      await courseApi.claimClass(cls.id, userId);
      showBanner("Đã nhận lớp thành công!");
      // Optimistic UI: Card automatically fades out and removes from list
      setClasses((prev) => prev.filter((item) => item.id !== cls.id));
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Lớp này vừa được nhận bởi giáo viên khác";
      showBanner(msg, true);
      // Auto-hide card to keep UI in sync
      setClasses((prev) => prev.filter((item) => item.id !== cls.id));
    } finally {
      setClaimingId(null);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Toast Notification */}
      {bannerMsg && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg border text-sm flex items-center gap-2 animate-in slide-in-from-top duration-200 ${
            bannerMsg.isError
              ? "bg-red-50 border-red-200 text-red-700 dark:bg-red-950 dark:border-red-800"
              : "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950 dark:border-emerald-800"
          }`}
        >
          {bannerMsg.isError ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
          <span>{bannerMsg.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="border-b border-border/60 pb-5">
        <h1 className="text-xl font-bold tracking-tight font-heading flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-purple-600" /> Lớp Gợi Ý Cho Bạn
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Danh sách lớp học thuộc lĩnh vực chuyên môn của bạn đang cần bổ sung giảng viên/trợ giảng.
        </p>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
      ) : classes.length > 0 ? (
        <div className="space-y-4">
          {classes.map((cls) => {
            const isOneOnOne = String(cls.type || "").includes("ONE") || String(cls.classType || "").includes("ONE");
            const currentMembers = cls.currentMemberCount || cls.assignedTeachersCount || 0;
            const maxMembers = cls.maxMembers || cls.requiredTeachersCount || (isOneOnOne ? 1 : 2);
            const progressPercent = Math.min(100, Math.round((currentMembers / maxMembers) * 100));
            const isBusy = claimingId === cls.id;

            return (
              <article
                key={cls.id}
                className="bg-card border border-border/60 p-5 rounded-2xl shadow-2xs hover:border-primary/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-out duration-300"
              >
                {/* Left: Course Name & Category */}
                <div className="space-y-2 max-w-lg">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md border border-border/60 text-[10px] font-bold text-muted-foreground bg-muted/30">
                      {cls.categoryName || cls.course?.categoryName || "Chuyên môn"}
                    </span>
                  </div>

                  <h3 className="font-bold text-base tracking-tight">{cls.name || cls.courseName || "Lớp học mới"}</h3>

                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {cls.scheduleNote || cls.timeSlot || "Lịch học linh hoạt theo thỏa thuận."}
                  </p>
                </div>

                {/* Middle: Badge & Progress Bar */}
                <div className="space-y-2 min-w-[200px]">
                  <div>
                    {isOneOnOne ? (
                      <span className="px-3 py-1 rounded-full bg-purple-500/10 text-purple-600 border border-purple-500/20 text-xs font-bold inline-block">
                        1-1 (Kèm cặp)
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20 text-xs font-bold inline-block">
                        GROUP (Lớp nhóm)
                      </span>
                    )}
                  </div>

                  {!isOneOnOne && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] text-muted-foreground font-semibold">
                        <span>Đã nhận:</span>
                        <span>
                          {currentMembers}/{maxMembers} giáo viên
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full transition-all duration-300"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Right: Instant Claim Button */}
                <div className="shrink-0">
                  <Button
                    disabled={isBusy}
                    onClick={() => handleClaimClass(cls)}
                    className="h-10 px-6 rounded-xl font-bold text-xs bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs gap-1.5"
                  >
                    {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Nhận Lớp
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-card border border-dashed border-border/80 rounded-2xl p-16 text-center space-y-3">
          <Users className="h-12 w-12 text-muted-foreground mx-auto" />
          <h3 className="font-bold text-base">Hiện chưa có lớp nào phù hợp với danh mục bạn phụ trách</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Hệ thống sẽ tự động thông báo khi có các đề xuất lớp học mới mở thuộc chuyên môn của bạn.
          </p>
        </div>
      )}
    </div>
  );
}

export default SuggestedClassesPage;
