import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { reviewApi } from "@/api/reviews/reviewApi";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MessageSquareWarning,
  Star,
  Loader2,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  User,
} from "lucide-react";

interface PendingReview {
  id: string | number;
  userName?: string;
  avatarUrl?: string;
  courseId: string | number;
  courseName?: string;
  rating: number;
  comment?: string;
  createdAt?: string;
}

export function ReviewModerationPage() {
  const [reviews, setReviews] = useState<PendingReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | number | null>(null);

  // Toast Banner
  const [bannerMsg, setBannerMsg] = useState<{ text: string; isError?: boolean } | null>(null);

  const showBanner = (text: string, isError = false) => {
    setBannerMsg({ text, isError });
    setTimeout(() => setBannerMsg(null), 4000);
  };

  const fetchPendingReviews = async () => {
    setLoading(true);
    try {
      // FIFO order: oldest first (createdAt,asc)
      const response = await reviewApi.searchReviews({
        status: "INACTIVE",
        page: 0,
        size: 100,
        sort: "createdAt:asc",
      });
      setReviews(response.data?.data?.content || []);
    } catch (err: any) {
      showBanner("Không thể tải hàng đợi kiểm duyệt đánh giá", true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingReviews();
  }, []);

  const handleModerate = async (reviewItem: PendingReview, approve: boolean) => {
    let rejectionReason: string | undefined = undefined;
    if (!approve) {
      const promptResult = window.prompt("Nhập lý do từ chối đánh giá này:")?.trim();
      if (promptResult === undefined) return; // User cancelled
      rejectionReason = promptResult || "Nội dung đánh giá không phù hợp quy định";
    }

    const previousReviews = [...reviews];

    // Optimistic UI: remove item immediately from list and decrement header counter
    setReviews((current) => current.filter((r) => r.id !== reviewItem.id));
    setBusyId(reviewItem.id);

    try {
      await reviewApi.moderate(reviewItem.id, approve, rejectionReason);
      showBanner(approve ? "Đã duyệt đánh giá thành công!" : "Đã từ chối đánh giá.");
    } catch (err: any) {
      // Rollback optimistic state on failure
      setReviews(previousReviews);
      showBanner("Lỗi khi cập nhật trạng thái đánh giá", true);
    } finally {
      setBusyId(null);
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
      <div className="border-b border-border/60 pb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight font-heading flex items-center gap-2">
            <MessageSquareWarning className="h-6 w-6 text-amber-500" /> Kiểm Duyệt Đánh Giá
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Rà soát các nhận xét nghi ngờ do hệ thống tự động gắn cờ trước khi hiển thị công khai.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 px-3.5 py-1.5 rounded-xl text-amber-600 dark:text-amber-400 text-xs font-bold shrink-0">
          <span>Chờ kiểm duyệt:</span>
          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 font-extrabold">{reviews.length}</span>
        </div>
      </div>

      {/* Content Queue List */}
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      ) : reviews.length > 0 ? (
        <div className="space-y-4">
          {reviews.map((item) => {
            const isBusy = busyId === item.id;

            return (
              <article
                key={item.id}
                className="bg-card border border-border/60 p-5 rounded-2xl shadow-2xs hover:border-primary/40 transition-all flex flex-col md:flex-row items-start justify-between gap-4 animate-in fade-out duration-300"
              >
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  {/* Student Avatar */}
                  <div className="h-11 w-11 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm shrink-0 border border-primary/20 overflow-hidden">
                    {item.avatarUrl ? (
                      <img src={item.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      (item.userName || "HV").substring(0, 2).toUpperCase()
                    )}
                  </div>

                  {/* Review Detail */}
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <h4 className="font-bold text-sm">{item.userName || "Học viên ẩn danh"}</h4>

                      {/* Gold Star Icons Rating */}
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, idx) => (
                          <Star
                            key={idx}
                            className={`h-4 w-4 ${
                              idx < item.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Complete untruncated comment text */}
                    <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                      {item.comment || "Không có nhận xét chi tiết."}
                    </p>

                    {/* Course Link Subline */}
                    <div className="pt-1">
                      <Link
                        to={`/courses/${item.courseId}`}
                        target="_blank"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                      >
                        <span>{item.courseName || `Khóa học #${item.courseId}`}</span>
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Right / Bottom Action Buttons */}
                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  <Button
                    variant="outline"
                    disabled={isBusy}
                    onClick={() => handleModerate(item, false)}
                    className="h-9 px-4 rounded-xl border-red-500/30 text-red-600 hover:bg-red-500/10 font-bold text-xs"
                  >
                    Từ Chối
                  </Button>

                  <Button
                    disabled={isBusy}
                    onClick={() => handleModerate(item, true)}
                    className="h-9 px-4 rounded-xl font-bold text-xs bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs gap-1.5"
                  >
                    {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    Duyệt
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        /* Positive Empty State */
        <div className="bg-card border border-dashed border-border/80 rounded-2xl p-16 text-center space-y-3">
          <div className="h-14 w-14 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
            <Sparkles className="h-7 w-7" />
          </div>
          <h3 className="font-bold text-base">Không có đánh giá nào cần kiểm duyệt 🎉</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Hàng đợi kiểm duyệt đã được xử lý hoàn tất.
          </p>
        </div>
      )}
    </div>
  );
}

export default ReviewModerationPage;
