import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Star,
  User,
  BookOpen,
  School,
  Calendar,
  CheckCircle2,
  Trash2,
  EyeOff,
  ExternalLink,
  MessageSquare,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { formatDateDisplay } from "@/components/ui/DatePickerInput";

export interface ReviewItem {
  id: string | number;
  userId?: string | number;
  userName?: string;
  avatarUrl?: string;
  schoolName?: string;
  courseId: string | number;
  courseName?: string;
  rating: number;
  comment?: string;
  status?: string;
  rejectionReason?: string;
  createdAt?: string;
}

interface ReviewDetailModalProps {
  open: boolean;
  onClose: () => void;
  review: ReviewItem | null;
  onModerate: (review: ReviewItem, approve: boolean) => Promise<void>;
  onDelete: (reviewId: string | number) => Promise<void>;
}

export const ReviewDetailModal: React.FC<ReviewDetailModalProps> = ({
  open,
  onClose,
  review,
  onModerate,
  onDelete,
}) => {
  const [submitting, setSubmitting] = useState(false);

  if (!review) return null;

  const isActive = review.status === "ACTIVE";
  const isRejected = review.status === "REJECTED";

  const handleAction = async (action: "approve" | "reject" | "delete") => {
    setSubmitting(true);
    try {
      if (action === "approve") {
        await onModerate(review, true);
      } else if (action === "reject") {
        await onModerate(review, false);
      } else if (action === "delete") {
        await onDelete(review.id);
      }
      onClose();
    } catch (err) {
      console.error("Action error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-2xl rounded-3xl p-6 sm:p-8 space-y-6">
        <DialogHeader className="space-y-2">
          <div className="flex items-center justify-between gap-4">
            <Badge
              variant="outline"
              className={`px-3 py-1 rounded-full text-xs font-bold ${
                isActive
                  ? "bg-success-forest/10 text-success-forest border-success-forest/20"
                  : isRejected
                  ? "bg-destructive/10 text-destructive border-destructive/20"
                  : "bg-amber-500/10 text-amber-600 border-amber-500/20"
              }`}
            >
              {isActive ? "Đã duyệt" : isRejected ? "Đã ẩn" : "Chờ kiểm duyệt"}
            </Badge>
            <span className="text-xs text-muted-foreground font-mono">
              ID: {review.id}
            </span>
          </div>
          <DialogTitle className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-primary" />
            <span>Chi tiết đánh giá khóa học</span>
          </DialogTitle>
        </DialogHeader>

        {/* Student & Course Header Card */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Student Info Card */}
          <div className="p-4 rounded-2xl bg-muted/40 border border-border/50 space-y-3">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-primary" /> Học viên đánh giá
            </span>
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm shrink-0 border border-primary/20 overflow-hidden">
                {review.avatarUrl ? (
                  <img src={review.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  (review.userName || "HV").substring(0, 2).toUpperCase()
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-sm text-foreground truncate">
                  {review.userName || "Học viên ẩn danh"}
                </h4>
                {review.schoolName && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 truncate mt-0.5">
                    <School className="h-3 w-3 shrink-0" />
                    <span>{review.schoolName}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Course Info Card */}
          <div className="p-4 rounded-2xl bg-muted/40 border border-border/50 space-y-3">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5 text-primary" /> Khóa học được đánh giá
            </span>
            <div className="space-y-1">
              <h4 className="font-bold text-sm text-foreground line-clamp-2">
                {review.courseName || `Khóa học #${review.courseId}`}
              </h4>
              <Link
                to={`/admin/courses/${review.courseId}`}
                target="_blank"
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline pt-1"
              >
                <span>Xem trang khóa học</span>
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>

        {/* Rating & Timestamp Banner */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-muted-foreground">Đánh giá sao:</span>
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, idx) => (
                <Star
                  key={idx}
                  className={`h-5 w-5 ${
                    idx < review.rating
                      ? "fill-amber-400 text-amber-400"
                      : "text-muted-foreground/30"
                  }`}
                />
              ))}
            </div>
            <span className="text-sm font-extrabold text-amber-600 dark:text-amber-400">
              {review.rating}.0 / 5.0
            </span>
          </div>

          {review.createdAt && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
              <Calendar className="h-3.5 w-3.5" />
              <span>{formatDateDisplay(review.createdAt)}</span>
            </div>
          )}
        </div>

        {/* Comment Content Box */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-foreground uppercase tracking-wider">
            Nội dung Nhận xét / Bình luận
          </label>
          <div className="p-4 rounded-2xl bg-card border border-border/70 text-sm text-foreground leading-relaxed whitespace-pre-wrap min-h-24 max-h-48 overflow-y-auto">
            {review.comment ? (
              review.comment
            ) : (
              <span className="italic text-muted-foreground">Học viên không để lại lời bình luận.</span>
            )}
          </div>
        </div>

        {/* Rejection Reason if any */}
        {review.rejectionReason && (
          <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 space-y-1">
            <span className="text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4" /> Lý do từ chối / ẩn hiển thị:
            </span>
            <p className="text-xs text-red-700 dark:text-red-300 font-medium">
              {review.rejectionReason}
            </p>
          </div>
        )}

        <DialogFooter className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-border/50">
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={submitting}
            onClick={() => handleAction("delete")}
            className="rounded-xl gap-1.5 font-bold cursor-pointer"
          >
            <Trash2 className="h-4 w-4" /> Xóa Đánh giá
          </Button>

          <div className="flex items-center gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="rounded-xl font-semibold"
            >
              Đóng
            </Button>

            {isActive ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={submitting}
                onClick={() => handleAction("reject")}
                className="rounded-xl border-amber-500/30 text-amber-600 hover:bg-amber-500/10 font-bold gap-1.5 cursor-pointer"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <EyeOff className="h-4 w-4" />}
                Ẩn đánh giá này
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                disabled={submitting}
                onClick={() => handleAction("approve")}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 shadow-xs cursor-pointer"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Duyệt & Hiển thị công khai
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
